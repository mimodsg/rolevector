import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { coverLetterTemplateSchema } from "@/lib/schemas/cover-letter";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The cover letter request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid cover letter template.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  throw error;
}

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const template = await prisma.coverLetterTemplate.findUnique({
      where: { userId }
    });

    return NextResponse.json({
      template: template ? { content: template.content } : null
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const input = coverLetterTemplateSchema.parse(await request.json());
    const template = await prisma.coverLetterTemplate.upsert({
      where: { userId },
      update: {
        content: input.content
      },
      create: {
        userId,
        content: input.content
      }
    });

    return NextResponse.json({
      template: { content: template.content }
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    await prisma.coverLetterTemplate.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
