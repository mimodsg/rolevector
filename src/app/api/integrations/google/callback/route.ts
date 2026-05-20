import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  appBaseUrl,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  verifyGoogleState
} from "@/lib/server/google-oauth";
import { requireCurrentUserId } from "@/lib/server/session";
import { encryptToken } from "@/lib/server/token-crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = appBaseUrl();
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(new URL("/account?google=denied", appUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/account?google=invalid", appUrl));
  }

  try {
    const userId = await requireCurrentUserId();

    if (!verifyGoogleState(state, userId)) {
      return NextResponse.redirect(new URL("/account?google=invalid", appUrl));
    }

    const tokens = await exchangeGoogleCode(code);
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);
    const existingConnection = await prisma.googleDriveConnection.findUnique({
      where: { userId }
    });
    const refreshTokenEncrypted = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : existingConnection?.refreshTokenEncrypted ?? null;

    await prisma.googleDriveConnection.upsert({
      create: {
        accessTokenEncrypted: encryptToken(tokens.access_token),
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        googleEmail: userInfo.email ?? "",
        googleSubject: userInfo.sub ?? "",
        refreshTokenEncrypted,
        scope: tokens.scope ?? "",
        tokenType: tokens.token_type ?? "",
        userId
      },
      update: {
        accessTokenEncrypted: encryptToken(tokens.access_token),
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        googleEmail: userInfo.email ?? "",
        googleSubject: userInfo.sub ?? "",
        refreshTokenEncrypted,
        scope: tokens.scope ?? "",
        tokenType: tokens.token_type ?? ""
      },
      where: { userId }
    });

    return NextResponse.redirect(new URL("/account?google=connected", appUrl));
  } catch (caughtError) {
    if (caughtError instanceof Response) {
      return NextResponse.redirect(new URL("/account?google=error", appUrl));
    }

    throw caughtError;
  }
}
