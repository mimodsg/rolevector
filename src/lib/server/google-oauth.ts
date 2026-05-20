import crypto from "node:crypto";
import { env } from "@/lib/env";

const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleUserInfoUrl = "https://openidconnect.googleapis.com/v1/userinfo";
const googleDriveScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file"
];

type GoogleState = {
  expiresAt: number;
  nonce: string;
  userId: string;
};

export type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export type GoogleUserInfo = {
  email?: string;
  sub?: string;
};

export function assertGoogleOAuthConfigured() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Response("Google OAuth is not configured.", {
      status: 500,
      statusText: "Google OAuth is not configured."
    });
  }
}

export function googleRedirectUri() {
  return new URL("/api/integrations/google/callback", appBaseUrl()).toString();
}

export function appBaseUrl() {
  const appUrl = env.APP_URL ?? env.NEXTAUTH_URL;

  if (!appUrl) {
    throw new Response("APP_URL or NEXTAUTH_URL is required for Google OAuth.", {
      status: 500,
      statusText: "Google OAuth redirect URL is not configured."
    });
  }

  return appUrl;
}

export function googleAuthorizationUrl(userId: string) {
  assertGoogleOAuthConfigured();
  const url = new URL(googleAuthUrl);

  url.searchParams.set("access_type", "offline");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleDriveScopes.join(" "));
  url.searchParams.set("state", signGoogleState({
    expiresAt: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString("base64url"),
    userId
  }));

  return url;
}

export async function exchangeGoogleCode(code: string) {
  assertGoogleOAuthConfigured();
  const response = await fetch(googleTokenUrl, {
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri()
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Response("Unable to connect Google Drive.", {
      status: 502,
      statusText: "Unable to connect Google Drive."
    });
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(googleUserInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return {};
  }

  return response.json() as Promise<GoogleUserInfo>;
}

export function verifyGoogleState(value: string, expectedUserId: string) {
  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return false;
  }

  let payload: GoogleState;

  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as GoogleState;
  } catch {
    return false;
  }

  return payload.userId === expectedUserId && payload.expiresAt >= Date.now();
}

function signGoogleState(payload: GoogleState) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(value)
    .digest("base64url");
}
