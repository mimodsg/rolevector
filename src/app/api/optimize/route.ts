import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema } from "@/lib/schemas/application";
import { parseJobDescription } from "@/lib/services/job-parser";
import { optimizeApplication } from "@/lib/services/ai-optimizer";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The optimization request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid job description.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  throw error;
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const { company, jobDetails, positionTitle, salary } = createApplicationSchema.parse(
      await request.json()
    );
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
        { error: "Create a master CV before optimizing an application." },
        { status: 400 }
      );
    }

    const masterCv = masterCvRecordToMasterCv(masterCvRecord);
    const masterCvText = masterCvToOptimizationText(masterCv);
    const parsedJob = parseJobDescription({
      company,
      jobDetails,
      positionTitle,
      salary
    });
    const coverLetterTemplate = await prisma.coverLetterTemplate.findUnique({
      where: { userId }
    });
    const optimized = await optimizeApplication({
      coverLetterTemplate: coverLetterTemplate?.content,
      masterCv,
      masterCvText,
      parsedJob
    });

    const application = await prisma.application.create({
      data: {
        userId,
        companyName: parsedJob.company_name,
        positionTitle: parsedJob.position_title,
        salary,
        location: parsedJob.location,
        jobDetails,
        parsedMetadata: parsedJob,
        optimizedCvJson: optimized.optimizedCvJson,
        coverLetterText: optimized.coverLetterText,
        atsScore: optimized.atsScore,
        aiUsage: {
          create: {
            userId,
            model: optimized.metadata.model,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCost: 0
          }
        }
      }
    });

    return NextResponse.json({
      application,
      metadata: optimized.metadata
    });
  } catch (error) {
    return apiError(error);
  }
}
