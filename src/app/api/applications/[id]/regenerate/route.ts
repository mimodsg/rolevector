import { NextResponse } from "next/server";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { prisma } from "@/lib/prisma";
import { parsedJobSchema } from "@/lib/schemas/job";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";
import { assessApplicationFit } from "@/lib/services/application-fit";
import { scoreAtsCompatibility } from "@/lib/services/ats-scoring";
import { generateCoverLetter } from "@/lib/services/cover-letter-generator";

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The regeneration request was not allowed." },
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
        { error: "Create a master CV before regenerating an application CV." },
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
    const fitAssessment = assessApplicationFit({
      applicationContext,
      masterCv,
      parsedJob
    });
    const coverLetterTemplate = await prisma.coverLetterTemplate.findUnique({
      where: { userId }
    });
    const updatedApplication = await prisma.application.update({
      where: { id: application.id },
      data: {
        atsScore: baselineScore,
        baselineAtsScore: baselineScore,
        coverLetterText: generateCoverLetter({
          applicationContext,
          masterCv,
          parsedJob,
          template: coverLetterTemplate?.content
        }),
        optimizedAt: null,
        optimizedCvJson: masterCv,
        optimizedCvText: masterCvText,
        fitAssessment,
        fitScore: fitAssessment.fitScore
      }
    });

    return NextResponse.json({ application: updatedApplication });
  } catch (error) {
    return apiError(error);
  }
}
