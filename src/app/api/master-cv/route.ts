import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { requireCurrentUserId } from "@/lib/server/session";

export async function GET() {
  const userId = await requireCurrentUserId();
  const masterCv = await prisma.masterCV.findUnique({
    where: { userId }
  });

  return NextResponse.json({ masterCv });
}

export async function PUT(request: Request) {
  const userId = await requireCurrentUserId();
  const content = masterCvSchema.parse(await request.json());
  const masterCv = await prisma.masterCV.upsert({
    where: { userId },
    update: { content },
    create: {
      userId,
      content
    }
  });

  return NextResponse.json({ masterCv });
}
