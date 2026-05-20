import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireCurrentUserId();

    await prisma.googleDriveConnection.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: error.statusText || "Unable to disconnect Google Drive." },
        { status: error.status || 500 }
      );
    }

    throw error;
  }
}
