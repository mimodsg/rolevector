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
import { scoreAtsCompatibility } from "@/lib/services/ats-scoring";
import { generateCoverLetter } from "@/lib/services/cover-letter-generator";
import { parseJobDescription } from "@/lib/services/job-parser";

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The rejected application request was not allowed." },
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

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const {
      company,
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
        { error: "Create a master CV before saving a rejected application." },
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
      applicationContext: {
        companyContext: "",
        companyUrl: "",
        jobApplicationUrl: "",
        jobContext: ""
      },
      masterCv,
      parsedJob
    });

    if (fitAssessment.generationDecision !== "BLOCK") {
      return NextResponse.json(
        { error: "Only blocked assessments can be saved as rejected applications." },
        { status: 409 }
      );
    }

    const baselineAts = scoreAtsCompatibility(masterCv, parsedJob);
    const coverLetterTemplate = await prisma.coverLetterTemplate.findUnique({
      where: { userId }
    });
    const application = await prisma.application.create({
      data: {
        userId,
        companyContext: "",
        companyName: parsedJob.company_name,
        companyUrl: "",
        positionTitle: parsedJob.position_title,
        salary,
        location: parsedJob.location,
        jobApplicationUrl: "",
        jobContext: "",
        jobDetails,
        parsedMetadata: parsedJob,
        optimizedCvJson: masterCv,
        optimizedCvText: normalizeCvSectionLabels(masterCvText),
        coverLetterText: generateCoverLetter({
          masterCv,
          parsedJob,
          template: coverLetterTemplate?.content
        }),
        baselineAtsScore: baselineAts.overall,
        atsScore: baselineAts.overall,
        fitAssessment,
        fitScore: fitAssessment.fitScore,
        status: "Rejected",
        analysisSnapshot: {
          contextCollected: false,
          exportApproved: false,
          fitDecision: fitAssessment.decision,
          fitRecommendation: fitAssessment.recommendation,
          fitScore: fitAssessment.fitScore,
          stage: "assessment_rejected"
        }
      }
    });

    return NextResponse.json({ application });
  } catch (error) {
    return apiError(error);
  }
}
