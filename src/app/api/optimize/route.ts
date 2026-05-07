import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema } from "@/lib/schemas/application";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { parseJobDescription } from "@/lib/services/job-parser";
import { optimizeApplication } from "@/lib/services/ai-optimizer";
import { requireCurrentUserId } from "@/lib/server/session";

export async function POST(request: Request) {
  const userId = await requireCurrentUserId();
  const { jobDescription } = createApplicationSchema.parse(await request.json());
  const masterCvRecord = await prisma.masterCV.findUnique({
    where: { userId }
  });

  if (!masterCvRecord) {
    return NextResponse.json(
      { error: "Create a master CV before optimizing an application." },
      { status: 400 }
    );
  }

  const masterCv = masterCvSchema.parse(masterCvRecord.content);
  const parsedJob = parseJobDescription(jobDescription);
  const optimized = await optimizeApplication({ masterCv, parsedJob });

  const application = await prisma.application.create({
    data: {
      userId,
      companyName: parsedJob.company_name,
      positionTitle: parsedJob.position_title,
      location: parsedJob.location,
      originalJobDescription: jobDescription,
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
}
