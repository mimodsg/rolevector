import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { optimizedMasterCvRecordToOptimizedMasterCv } from "@/lib/optimized-master-cv";
import {
  masterCvRecordToMasterCv,
  masterCvToCreateData,
  masterCvToUpdateData
} from "@/lib/master-cv";
import { prisma } from "@/lib/prisma";
import {
  isMissingTableError,
  optimizedMasterCvMigrationMessage
} from "@/lib/server/prisma-errors";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";
import {
  applyOptimizedMasterCvSuggestions,
  type OptimizedMasterCvSuggestions,
  generateOptimizedMasterCvSuggestions
} from "@/lib/services/optimized-master-cv";

const skillSuggestionSchema = z.object({
  bucket: z.enum([
    "hard_skills",
    "soft_skills",
    "technical_skills.languages",
    "technical_skills.frameworks",
    "technical_skills.cms",
    "technical_skills.tools"
  ]),
  evidence: z.array(z.string()),
  id: z.string().trim().min(1),
  reason: z.string(),
  skill: z.string(),
  type: z.enum(["add_skill", "remove_skill"])
});

const editorialSuggestionSchema = z.object({
  currentText: z.string(),
  entityLabel: z.string(),
  entityType: z.enum(["experience", "project"]),
  id: z.string().trim().min(1),
  index: z.number().int().min(0),
  reason: z.string(),
  suggestedText: z.string(),
  type: z.enum(["edit_experience", "edit_project"])
});

const optimizedMasterCvSuggestionsSchema = z.object({
  editorialUpdates: z.array(editorialSuggestionSchema),
  skillsMissing: z.array(skillSuggestionSchema),
  skillsToRemove: z.array(skillSuggestionSchema)
});

const createOptimizedMasterCvSchema = z.object({
  selectedSuggestionIds: z.array(z.string().trim()).default([]),
  suggestions: optimizedMasterCvSuggestionsSchema.optional()
});

const promoteOptimizedMasterCvSchema = z.object({
  optimizedMasterCvId: z.string().trim().min(1)
});

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The optimized Master CV request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid optimized Master CV request.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (
    isMissingTableError(error, "optimized_master_cvs") ||
    isMissingTableError(error, "master_cv_revisions")
  ) {
    return NextResponse.json(
      { error: optimizedMasterCvMigrationMessage() },
      { status: 503 }
    );
  }

  throw error;
}

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const optimizedMasterCvs = await prisma.optimizedMasterCV.findMany({
      orderBy: [{ isMain: "desc" }, { revisionNumber: "desc" }],
      where: { userId }
    });

    return NextResponse.json({
      optimizedMasterCvs: optimizedMasterCvs.map(optimizedMasterCvRecordToOptimizedMasterCv)
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const input = createOptimizedMasterCvSchema.parse(await request.json());
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
        { error: "Create and save a Master CV before optimizing it." },
        { status: 409 }
      );
    }

    const masterCv = masterCvRecordToMasterCv(masterCvRecord);
    const suggestions: OptimizedMasterCvSuggestions =
      input.suggestions ?? (await generateOptimizedMasterCvSuggestions(masterCv));
    const optimizedCv = applyOptimizedMasterCvSuggestions({
      masterCv,
      selectedSuggestionIds: input.selectedSuggestionIds,
      suggestions
    });

    const optimizedMasterCv = await prisma.$transaction(async (tx) => {
      const revision =
        (
          await tx.optimizedMasterCV.aggregate({
            _max: { revisionNumber: true },
            where: { userId }
          })
        )._max.revisionNumber ?? 0;

      await tx.optimizedMasterCV.updateMany({
        data: { isMain: false },
        where: { userId }
      });

      return tx.optimizedMasterCV.create({
        data: {
          appliedSuggestionIds: input.selectedSuggestionIds,
          cvJson: optimizedCv,
          isMain: true,
          masterCvId: masterCvRecord.id,
          revisionNumber: revision + 1,
          userId
        }
      });
    });

    return NextResponse.json({
      optimizedMasterCv: optimizedMasterCvRecordToOptimizedMasterCv(optimizedMasterCv)
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const input = promoteOptimizedMasterCvSchema.parse(await request.json());
    const optimizedMasterCv = await prisma.optimizedMasterCV.findFirst({
      where: {
        id: input.optimizedMasterCvId,
        userId
      }
    });

    if (!optimizedMasterCv) {
      return NextResponse.json({ error: "Optimized Master CV not found." }, { status: 404 });
    }

    const optimizedCv = optimizedMasterCvRecordToOptimizedMasterCv(optimizedMasterCv).cvJson;

    await prisma.$transaction(async (tx) => {
      const revisionStore = tx as typeof tx & {
        masterCVRevision: {
          aggregate: (args: {
            _max: { revisionNumber: true };
            where: { userId: string };
          }) => Promise<{ _max: { revisionNumber: number | null } }>;
          create: (args: {
            data: {
              cvJson: ReturnType<typeof masterCvRecordToMasterCv>;
              revisionNumber: number;
              sourceMasterCvId: string;
              userId: string;
            };
          }) => Promise<unknown>;
        };
      };

      const currentMasterCv = await tx.masterCV.findUnique({
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

      if (currentMasterCv) {
        const nextRevisionNumber =
          (
            await revisionStore.masterCVRevision.aggregate({
              _max: { revisionNumber: true },
              where: { userId }
            })
          )._max.revisionNumber ?? 0;

        await revisionStore.masterCVRevision.create({
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
        where: { id: optimizedMasterCv.id }
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
