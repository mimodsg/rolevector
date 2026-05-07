import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/server/session";

export async function GET() {
  const userId = await requireCurrentUserId();
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ applications });
}
