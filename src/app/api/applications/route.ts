import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import {
  masterCvToOptimizationText,
  normalizeCvSectionLabels
} from "@/lib/master-cv-text";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema } from "@/lib/schemas/application";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";
import { assessApplicationFit } from "@/lib/services/application-fit";
import { extractApplicationContext } from "@/lib/services/application-context";
import { scoreAtsCompatibility } from "@/lib/services/ats-scoring";
import { generateCoverLetter } from "@/lib/services/cover-letter-generator";
import {
  buildRoleAssessmentOverride,
  optimizeApplication
} from "@/lib/services/ai-optimizer";
import { parseJobDescription } from "@/lib/services/job-parser";

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The application request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid application data.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  throw error;
}

export async function GET() {
  const userId = await requireCurrentUserId();
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const {
      company,
      companyUrl,
      jobApplicationUrl,
      jobDetails,
      positionTitle,
      salary
    } = createApplicationSchema.parse(await request.json());
    const masterCvRecord = await prisma.masterCV.findUnique({
      where: { userId },
      include: {
        workExperiences: {
          orderBy: { sortOrder: "asc" }
        },
        projects: {
          orderBy: { sortOrder: "asc" }
        },
        educationEntries: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    if (!masterCvRecord) {
      return NextResponse.json(
        { error: "Create a master CV before creating an application." },
        { status: 400 }
      );
    }

    const masterCv = masterCvRecordToMasterCv(masterCvRecord);
    const masterCvText = masterCvToOptimizationText(masterCv);
    const parsedJob = parseJobDescription({
      company,
      jobDetails,
      masterCv,
      positionTitle,
      salary
    });
    const fitAssessment = assessApplicationFit({
      masterCv,
      parsedJob
    });

    const applicationContext = await extractApplicationContext({
      companyUrl,
      jobApplicationUrl
    });
    const baselineScore = scoreAtsCompatibility(masterCv, parsedJob).overall;
    const coverLetterTemplate = await prisma.coverLetterTemplate.findUnique({
      where: { userId }
    });
    const draftCoverLetter = generateCoverLetter({
      masterCv,
      parsedJob,
      applicationContext,
      template: coverLetterTemplate?.content
    });
    const application = await prisma.application.create({
      data: {
        userId,
        companyContext: applicationContext.companyContext,
        companyName: parsedJob.company_name,
        companyUrl: applicationContext.companyUrl,
        positionTitle: parsedJob.position_title,
        salary,
        location: parsedJob.location,
        jobApplicationUrl: applicationContext.jobApplicationUrl,
        jobContext: applicationContext.jobContext,
        jobDetails,
        parsedMetadata: parsedJob,
        optimizedCvJson: masterCv,
        optimizedCvText: normalizeCvSectionLabels(masterCvText),
        coverLetterText: draftCoverLetter,
        baselineAtsScore: baselineScore,
        atsScore: baselineScore,
        fitAssessment,
        fitScore: fitAssessment.fitScore,
        analysisSnapshot: {
          contextCollected: true,
          exportApproved: false,
          fitDecision: fitAssessment.decision,
          fitRecommendation: fitAssessment.recommendation,
          fitScore: fitAssessment.fitScore,
          stage: "context_collected"
        }
      }
    });
    const assessmentOverride = buildRoleAssessmentOverride({
      jobDetails,
      masterCv,
      masterCvText,
      parsedJob
    });
    const optimized = await optimizeApplication({
      assessmentOverride,
      applicationContext,
      coverLetterTemplate: coverLetterTemplate?.content,
      jobDetails,
      masterCv,
      masterCvText,
      parsedJob
    });
    const persistedCv = optimized.exportReady ? optimized.optimizedCvJson : masterCv;
    const optimizedCvText = normalizeCvSectionLabels(masterCvToOptimizationText(persistedCv));
    const updatedApplication = await prisma.application.update({
      where: { id: application.id },
      data: {
        atsScore: optimized.exportReady ? optimized.atsScore : baselineScore,
        baselineAtsScore: baselineScore,
        coverLetterText: optimized.exportReady ? optimized.coverLetterText : draftCoverLetter,
        fitAssessment,
        fitScore: fitAssessment.fitScore,
        optimizedAt: optimized.exportReady ? new Date() : null,
        optimizedCvJson: persistedCv,
        optimizedCvText,
        analysisSnapshot: {
          assessorDecision: assessmentOverride.decision,
          assessorFitScore: assessmentOverride.fitScore,
          contextCollected: true,
          exportApproved: optimized.exportReady,
          fitDecision: fitAssessment.decision,
          fitRecommendation: fitAssessment.recommendation,
          fitScore: fitAssessment.fitScore,
          stage: optimized.exportReady ? "optimization_approved" : "optimization_rejected",
          workflowStatus: optimized.workflow.status
        }
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

    return NextResponse.json({ application: updatedApplication, metadata: optimized.metadata });
  } catch (error) {
    return apiError(error);
  }
}
