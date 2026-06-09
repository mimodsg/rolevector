import { NextResponse } from "next/server";
import {
  masterCvRecordToMasterCv,
  masterCvToCreateData,
  masterCvToUpdateData
} from "@/lib/master-cv";
import { prisma } from "@/lib/prisma";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";

function revisionStore<TClient extends object>(client: TClient) {
  return client as TClient & {
    masterCVRevision?: {
      aggregate: (args: {
        _max: { revisionNumber: true };
        where: { userId: string };
      }) => Promise<{ _max: { revisionNumber: number | null } }>;
      create: (args: {
        data: {
          cvJson: ReturnType<typeof masterCvSchema.parse>;
          revisionNumber: number;
          sourceMasterCvId: string;
          userId: string;
        };
      }) => Promise<unknown>;
    };
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireCurrentUserId();
  assertSameOrigin(request);
  const { id } = await params;

  const optimizedMasterCv = await prisma.optimizedMasterCV.findFirst({
    where: { id, userId }
  });

  if (!optimizedMasterCv) {
    return NextResponse.json({ error: "Optimized Master CV revision not found." }, { status: 404 });
  }

  const optimizedCv = masterCvSchema.parse(optimizedMasterCv.cvJson);

  await prisma.$transaction(async (tx) => {
    const txStore = revisionStore(tx);
    const currentMasterCv = await tx.masterCV.findUnique({
      where: { userId },
      include: {
        workExperiences: { orderBy: { sortOrder: "asc" } },
        projects: { orderBy: { sortOrder: "asc" } },
        educationEntries: { orderBy: { sortOrder: "asc" } }
      }
    });

    if (currentMasterCv && txStore.masterCVRevision) {
      const nextRevisionNumber =
        (
          await txStore.masterCVRevision.aggregate({
            _max: { revisionNumber: true },
            where: { userId }
          })
        )._max.revisionNumber ?? 0;

      await txStore.masterCVRevision.create({
        data: {
          cvJson: masterCvRecordToMasterCv(currentMasterCv),
          revisionNumber: nextRevisionNumber + 1,
          sourceMasterCvId: currentMasterCv.id,
          userId
        }
      });
    }

    await tx.masterCV.upsert({
      where: { userId },
      update: masterCvToUpdateData(optimizedCv),
      create: {
        userId,
        ...masterCvToCreateData(optimizedCv)
      }
    });

    await tx.optimizedMasterCV.updateMany({
      data: { isMain: false },
      where: { userId }
    });

    await tx.optimizedMasterCV.update({
      data: {
        isMain: true,
        promotedAt: new Date()
      },
      where: { id }
    });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireCurrentUserId();
  assertSameOrigin(request);
  const { id } = await params;

  const optimizedMasterCv = await prisma.optimizedMasterCV.findFirst({
    where: { id, userId }
  });

  if (!optimizedMasterCv) {
    return NextResponse.json({ error: "Optimized Master CV revision not found." }, { status: 404 });
  }

  await prisma.optimizedMasterCV.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true });
}
