import { NextResponse } from "next/server";
import { extractMasterCvText, parseMasterCvText } from "@/lib/services/master-cv-importer";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUser } from "@/lib/server/session";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The import request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  throw error;
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    assertSameOrigin(request);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a .txt or .pdf file." }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isSupported =
      file.type === "text/plain" ||
      file.type === "application/pdf" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".pdf");

    if (!isSupported) {
      return NextResponse.json({ error: "Only .txt and .pdf files are supported." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Upload files must be 5 MB or smaller." }, { status: 400 });
    }

    const text = await extractMasterCvText(file);

    if (!text.trim()) {
      return NextResponse.json({ error: "No readable text was found in this file." }, { status: 400 });
    }

    const masterCv = parseMasterCvText({
      fallbackEmail: user.email,
      fallbackName: user.name,
      text
    });

    return NextResponse.json({
      masterCv,
      metadata: {
        characters: text.length,
        fileName: file.name
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
