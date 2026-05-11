import { NextResponse } from "next/server";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { prisma } from "@/lib/prisma";
import { parsedJobSchema } from "@/lib/schemas/job";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";
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
    const baselineScore = scoreAtsCompatibility(masterCv, parsedJob).overall;
    const coverLetterTemplate = await prisma.coverLetterTemplate.findUnique({
      where: { userId }
    });
    const optimized = await optimizeApplication({
      coverLetterTemplate: coverLetterTemplate?.content,
      masterCv,
      masterCvText,
      parsedJob
    });
    const optimizedCvText = masterCvToOptimizationText(optimized.optimizedCvJson);

    const updatedApplication = await prisma.application.update({
      where: { id: application.id },
      data: {
        atsScore: optimized.atsScore,
        baselineAtsScore: baselineScore,
        coverLetterText: optimized.coverLetterText,
        optimizedAt: new Date(),
        optimizedCvJson: optimized.optimizedCvJson,
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
