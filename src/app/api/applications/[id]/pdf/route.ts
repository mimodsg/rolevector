import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import { renderPdfBuffer } from "@/lib/services/pdf-renderer";
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

  const pdf = await renderPdfBuffer({
    cv: masterCvSchema.parse(application.optimizedCvJson),
    coverLetter: application.coverLetterText
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${application.positionTitle ?? "application"}.pdf"`
    }
  });
}
