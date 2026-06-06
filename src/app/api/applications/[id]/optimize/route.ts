import { NextResponse } from "next/server";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import {
  masterCvToOptimizationText,
  normalizeCvSectionLabels
} from "@/lib/master-cv-text";
import { prisma } from "@/lib/prisma";
import { parsedJobSchema } from "@/lib/schemas/job";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";
import { assessApplicationFit } from "@/lib/services/application-fit";
import { scoreAtsCompatibility } from "@/lib/services/ats-scoring";
import { optimizeApplication } from "@/lib/services/ai-optimizer";

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The optimization request was not allowed." },
      { status: error.status || 500 }
    );
  }

  throw error;
}

async function logOptimizationError({
  applicationId,
  error,
  userId
}: {
  applicationId?: string;
  error: unknown;
  userId?: string;
}) {
  if (!applicationId || !userId) {
    return;
  }

  try {
    await prisma.aIErrorLog.create({
      data: {
        applicationId,
        errorMessage:
          error instanceof Error ? error.message : "Unknown optimization error.",
        model: process.env.OPENAI_MODEL ?? "optimization",
        userId
      }
    });
  } catch {
    // Avoid masking the original optimization failure with logging failures.
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let applicationId: string | undefined;
  let userId: string | undefined;

  try {
    userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const { id } = await context.params;
    applicationId = id;
    const application = await prisma.application.findFirst({
      where: { id, userId }
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.optimizedAt) {
      return NextResponse.json(
        { error: "This application has already been optimized." },
        { status: 409 }
      );
    }

    const masterCvRecord = await prisma.masterCV.findUnique({
      where: { userId },
      include: {
        educationEntries: {
          orderBy: { sortOrder: "asc" }
        },
        projects: {
          orderBy: { sortOrder: "asc" }
        },
        workExperiences: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    if (!masterCvRecord) {
      return NextResponse.json(
        { error: "Create a master CV before optimizing an application." },
        { status: 400 }
      );
    }

    const masterCv = masterCvRecordToMasterCv(masterCvRecord);
    const masterCvText = masterCvToOptimizationText(masterCv);
    const parsedJob = parsedJobSchema.parse(application.parsedMetadata);
    const applicationContext = {
      companyContext: application.companyContext,
      companyUrl: application.companyUrl,
      jobApplicationUrl: application.jobApplicationUrl,
      jobContext: application.jobContext
    };
    const baselineScore = scoreAtsCompatibility(masterCv, parsedJob).overall;
    const coverLetterTemplate = await prisma.coverLetterTemplate.findUnique({
      where: { userId }
    });
    const optimized = await optimizeApplication({
      applicationContext,
      coverLetterTemplate: coverLetterTemplate?.content,
      jobDetails: application.jobDetails,
      masterCv,
      masterCvText,
      parsedJob
    });
    const persistedCv = optimized.exportReady ? optimized.optimizedCvJson : masterCv;
    const optimizedCvText = normalizeCvSectionLabels(masterCvToOptimizationText(persistedCv));
    const fitAssessment = assessApplicationFit({
      applicationContext,
      masterCv: persistedCv,
      parsedJob
    });
    const mergedFitAssessment = mergeWorkflowWarnings(fitAssessment, optimized);

    const updatedApplication = await prisma.application.update({
      where: { id: application.id },
      data: {
        atsScore: optimized.exportReady ? optimized.atsScore : baselineScore,
        baselineAtsScore: baselineScore,
        coverLetterText: optimized.exportReady
          ? optimized.coverLetterText
          : application.coverLetterText,
        fitAssessment: mergedFitAssessment,
        fitScore: optimized.workflow.assessor.fitScore,
        optimizedAt: optimized.exportReady ? new Date() : null,
        optimizedCvJson: persistedCv,
        optimizedCvText
      }
    });
    await prisma.aIUsage.create({
      data: {
        applicationId: application.id,
        estimatedCost: 0,
        inputTokens: optimized.metadata.inputTokens,
        model: optimized.metadata.model,
        outputTokens: optimized.metadata.outputTokens,
        userId
      }
    });
    if (optimized.metadata.fallbackReason) {
      await logOptimizationError({
        applicationId: application.id,
        error: new Error(optimized.metadata.fallbackReason),
        userId
      });
    }

    return NextResponse.json({
      application: updatedApplication,
      metadata: optimized.metadata
    });
  } catch (error) {
    await logOptimizationError({ applicationId, error, userId });

    return apiError(error);
  }
}

function mergeWorkflowWarnings(
  fitAssessment: ReturnType<typeof assessApplicationFit>,
  optimized: Awaited<ReturnType<typeof optimizeApplication>>
) {
  const auditFixes = optimized.workflow.audits.flatMap((audit) => audit.requiredFixes);
  const riskFlags = unique([
    ...fitAssessment.riskFlags,
    ...optimized.workflow.assessor.riskNotes,
    ...auditFixes
  ]);
  const statusSummary =
    optimized.workflow.status === "approved"
      ? fitAssessment.summary
      : optimized.workflow.status === "skipped_low_fit"
        ? `Role Assessor stopped optimization at ${optimized.workflow.assessor.fitScore}/10. Review the risk flags before spending time on this role.`
        : "CV Auditor did not approve the tailored CV after one retry pass. Review the required fixes before exporting.";

  return {
    ...fitAssessment,
    gaps: unique([
      ...fitAssessment.gaps,
      ...optimized.workflow.assessor.missingRequirements
    ]),
    riskFlags,
    summary: statusSummary
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
