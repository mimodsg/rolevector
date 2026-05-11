import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { masterCvSchema } from "@/lib/schemas/master-cv";
import {
  renderCoverLetterPdfBuffer,
  renderCvPdfBuffer
} from "@/lib/services/pdf-renderer";
import { requireCurrentUserId } from "@/lib/server/session";
import { createZip } from "@/lib/zip";

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

  const baseName = filenameSafe(application.positionTitle ?? "application");
  const cv = masterCvSchema.parse(application.optimizedCvJson);
  const cvPdf = await renderCvPdfBuffer(cv);
  const coverLetterPdf = await renderCoverLetterPdfBuffer(application.coverLetterText);
  const archive = createZip([
    { data: Buffer.from(cvPdf), name: `${baseName}-cv.pdf` },
    { data: Buffer.from(coverLetterPdf), name: `${baseName}-cover-letter.pdf` }
  ]);

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${baseName}-documents.zip"`
    }
  });
}

function filenameSafe(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "application"
  );
}
