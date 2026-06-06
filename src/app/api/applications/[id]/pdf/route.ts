import { NextResponse } from "next/server";
import { applicationDocumentNames } from "@/lib/application-document-names";
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

  if (!application.optimizedAt) {
    return NextResponse.json(
      {
        error:
          "Export is available only after the CV workflow approves the application for export."
      },
      { status: 409 }
    );
  }

  const cv = masterCvSchema.parse(application.optimizedCvJson);
  const names = applicationDocumentNames({
    candidateName: cv.basics.full_name,
    companyName: application.companyName,
    positionTitle: application.positionTitle
  });
  const cvPdf = await renderCvPdfBuffer(cv);
  const coverLetterPdf = await renderCoverLetterPdfBuffer(application.coverLetterText);
  const archive = createZip([
    { data: Buffer.from(cvPdf), name: `${names.folderName}/${names.cvPdf}` },
    {
      data: Buffer.from(coverLetterPdf),
      name: `${names.folderName}/${names.coverLetterPdf}`
    }
  ]);

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${names.zipName}"`
    }
  });
}
