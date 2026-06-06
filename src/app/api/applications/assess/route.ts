import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";
import { assessApplicationFit } from "@/lib/services/application-fit";
import { extractApplicationContext } from "@/lib/services/application-context";
import { scoreAtsCompatibility } from "@/lib/services/ats-scoring";
import { parseJobDescription } from "@/lib/services/job-parser";
import { z } from "zod";

const assessApplicationSchema = z.object({
  company: z.string().trim().optional().default(""),
  companyUrl: z.union([z.string().url("Enter a valid URL."), z.literal("")]).optional().default(""),
  jobDetails: z.string().trim().min(50, "Paste the full job details."),
  jobApplicationUrl: z
    .union([z.string().url("Enter a valid URL."), z.literal("")])
    .optional()
    .default(""),
  positionTitle: z.string().trim().optional().default(""),
  salary: z.string().trim().optional().default("")
});

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The assessment request was not allowed." },
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
      companyUrl,
      jobApplicationUrl,
      jobDetails,
      positionTitle,
      salary
    } = assessApplicationSchema.parse(await request.json());
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
        { error: "Create a master CV before assessing an application." },
        { status: 400 }
      );
    }

    const masterCv = masterCvRecordToMasterCv(masterCvRecord);
    const parsedJob = parseJobDescription({
      company,
      jobDetails,
      masterCv,
      positionTitle,
      salary
    });
    const applicationContext = await extractApplicationContext({
      companyUrl,
      jobApplicationUrl
    });
    const baselineAts = scoreAtsCompatibility(masterCv, parsedJob);
    const fitAssessment = assessApplicationFit({
      applicationContext,
      masterCv,
      parsedJob
    });

    return NextResponse.json({
      assessment: {
        applicationContext,
        atsBreakdown: baselineAts,
        baselineAtsScore: baselineAts.overall,
        companyName: parsedJob.company_name,
        decision: fitAssessment.decision,
        fitAssessment,
        fitScore: fitAssessment.fitScore,
        parsedJob,
        positionTitle: parsedJob.position_title,
        salary: salary || "",
        workflowStatus: workflowStatusFromFit(fitAssessment.fitScore)
      }
    });
  } catch (error) {
    return apiError(error);
  }
}

function workflowStatusFromFit(fitScore: number) {
  if (fitScore >= 7) {
    return "ready_for_generation";
  }

  if (fitScore >= 5) {
    return "ready_with_caution";
  }

  return "assessment_rejected";
}
