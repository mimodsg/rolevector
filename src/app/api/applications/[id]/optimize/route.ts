import { NextResponse } from "next/server";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { prisma } from "@/lib/prisma";
import { parsedJobSchema } from "@/lib/schemas/job";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const { id } = await context.params;
    const application = await prisma.application.findFirst({
      where: { id, userId }
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const applicationCv = masterCvSchema.parse(application.optimizedCvJson);
    const parsedJob = parsedJobSchema.parse(application.parsedMetadata);
    const coverLetterTemplate = await prisma.coverLetterTemplate.findUnique({
      where: { userId }
    });
    const optimized = await optimizeApplication({
      coverLetterTemplate: coverLetterTemplate?.content,
      masterCv: applicationCv,
      masterCvText:
        application.optimizedCvText || masterCvToOptimizationText(applicationCv),
      parsedJob
    });
    const optimizedCvText = masterCvToOptimizationText(optimized.optimizedCvJson);

    const updatedApplication = await prisma.application.update({
      where: { id: application.id },
      data: {
        atsScore: optimized.atsScore,
        coverLetterText: optimized.coverLetterText,
        optimizedAt: new Date(),
        optimizedCvJson: optimized.optimizedCvJson,
        optimizedCvText
      }
    });

    return NextResponse.json({
      application: updatedApplication,
      metadata: optimized.metadata
    });
  } catch (error) {
    return apiError(error);
  }
}
