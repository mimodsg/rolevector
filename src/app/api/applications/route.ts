import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { masterCvToOptimizationText } from "@/lib/master-cv-text";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema } from "@/lib/schemas/application";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";
import { generateCoverLetter } from "@/lib/services/cover-letter-generator";
import { parseJobDescription } from "@/lib/services/job-parser";
import { scoreAtsCompatibility } from "@/lib/services/ats-scoring";

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
        { error: "Create a master CV before creating an application." },
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
    const score = scoreAtsCompatibility(masterCv, parsedJob);
    const application = await prisma.application.create({
      data: {
        userId,
        companyName: parsedJob.company_name,
        positionTitle: parsedJob.position_title,
        salary,
        location: parsedJob.location,
        jobDetails,
        parsedMetadata: parsedJob,
        optimizedCvJson: masterCv,
        optimizedCvText: masterCvText,
        coverLetterText: generateCoverLetter({
          masterCv,
          parsedJob,
          template: coverLetterTemplate?.content
        }),
        atsScore: score.overall
      }
    });

    return NextResponse.json({ application });
  } catch (error) {
    return apiError(error);
  }
}
