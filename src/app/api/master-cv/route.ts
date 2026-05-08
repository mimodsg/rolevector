import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import {
  masterCvRecordToMasterCv,
  masterCvToCreateData,
  masterCvToUpdateData
} from "@/lib/master-cv";
import { requireCurrentUserId } from "@/lib/server/session";

export async function GET() {
  const userId = await requireCurrentUserId();
  const masterCv = await prisma.masterCV.findUnique({
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

  return NextResponse.json({
    masterCv: masterCv ? masterCvRecordToMasterCv(masterCv) : null
  });
}

export async function PUT(request: Request) {
  const userId = await requireCurrentUserId();
  const masterCvInput = masterCvSchema.parse(await request.json());
  await prisma.masterCV.upsert({
    where: { userId },
    update: masterCvToUpdateData(masterCvInput),
    create: {
      userId,
      ...masterCvToCreateData(masterCvInput)
    }
  });
  const masterCv = await prisma.masterCV.findUnique({
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

  return NextResponse.json({
    masterCv: masterCv ? masterCvRecordToMasterCv(masterCv) : null
  });
}
