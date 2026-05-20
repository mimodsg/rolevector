import { NextResponse } from "next/server";
import { appBaseUrl, googleAuthorizationUrl } from "@/lib/server/google-oauth";
import { requireCurrentUserId } from "@/lib/server/session";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();

    return NextResponse.redirect(googleAuthorizationUrl(userId));
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.redirect(
        new URL(
          "/account?google=not-configured",
          appBaseUrl()
        )
      );
    }

    throw error;
  }
}
