import { NextResponse } from "next/server";
import { optimizedMasterCvRecordToOptimizedMasterCv } from "@/lib/optimized-master-cv";
import { masterCvRecordToMasterCv } from "@/lib/master-cv";
import { prisma } from "@/lib/prisma";
import {
  isMissingTableError,
  optimizedMasterCvMigrationMessage
} from "@/lib/server/prisma-errors";
import { requireCurrentUserId } from "@/lib/server/session";
import { generateOptimizedMasterCvSuggestions } from "@/lib/services/optimized-master-cv";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const [masterCvRecord, optimizedMasterCvs] = await Promise.all([
      prisma.masterCV.findUnique({
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
      }),
      prisma.optimizedMasterCV.findMany({
        orderBy: [{ isMain: "desc" }, { revisionNumber: "desc" }],
        where: { userId }
      })
    ]);

    if (!masterCvRecord) {
      return NextResponse.json({
        masterCv: null,
        optimizedMasterCvs: optimizedMasterCvs.map(optimizedMasterCvRecordToOptimizedMasterCv),
        suggestions: null
      });
    }

    const masterCv = masterCvRecordToMasterCv(masterCvRecord);

    return NextResponse.json({
      masterCv,
      optimizedMasterCvs: optimizedMasterCvs.map(optimizedMasterCvRecordToOptimizedMasterCv),
      suggestions: await generateOptimizedMasterCvSuggestions(masterCv)
    });
  } catch (error) {
    if (isMissingTableError(error, "optimized_master_cvs")) {
      return NextResponse.json(
        { error: optimizedMasterCvMigrationMessage() },
        { status: 503 }
      );
    }

    throw error;
  }
}
