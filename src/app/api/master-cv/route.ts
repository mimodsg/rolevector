import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { assertSameOrigin } from "@/lib/server/request";
import {
  masterCvRecordToMasterCv,
  masterCvToCreateData,
  masterCvToUpdateData
} from "@/lib/master-cv";
import { requireCurrentUserId } from "@/lib/server/session";

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The master CV request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid master CV data.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  throw error;
}

export async function GET() {
  try {
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
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
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
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    await prisma.masterCV.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
