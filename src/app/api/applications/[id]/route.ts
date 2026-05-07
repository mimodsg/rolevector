import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateApplicationSchema } from "@/lib/schemas/application";
import { requireCurrentUserId } from "@/lib/server/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requireCurrentUserId();
  const { id } = await context.params;
  const application = await prisma.application.findFirst({
    where: { id, userId }
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  return NextResponse.json({ application });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requireCurrentUserId();
  const { id } = await context.params;
  const input = updateApplicationSchema.parse(await request.json());
  const application = await prisma.application.updateMany({
    where: { id, userId },
    data: { status: input.status }
  });

  if (application.count === 0) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
