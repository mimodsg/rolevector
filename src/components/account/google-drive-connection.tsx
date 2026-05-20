"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { HelperText } from "@/components/ui/typography";

type GoogleDriveConnectionProps = {
  connection: {
    googleEmail: string;
    updatedAt: string;
  } | null;
  googleStatus?: string;
  isConfigured: boolean;
};

const googleMessages: Record<string, string> = {
  connected: "Google Drive connected.",
  denied: "Google connection was cancelled.",
  error: "Unable to connect Google Drive.",
  invalid: "Google connection could not be verified.",
  "not-configured": "Google OAuth is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the app."
};

export function GoogleDriveConnection({
  connection,
  googleStatus,
  isConfigured
}: GoogleDriveConnectionProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  async function disconnect() {
    setError("");
    setIsDisconnecting(true);

    try {
      const response = await fetch("/api/integrations/google/disconnect", {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Unable to disconnect Google Drive.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to disconnect Google Drive."
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <Panel>
      <div className="grid gap-4">
        <div>
          <h2 className="font-title text-2xl font-medium uppercase text-rv-text">
            Google Drive
          </h2>
          <HelperText>
            Connect your Google account so RoleVector can save generated CV and cover letter documents to your Drive.
          </HelperText>
        </div>
        {googleStatus && googleMessages[googleStatus] ? (
          <Alert tone={googleStatus === "connected" ? "success" : "error"}>
            {googleMessages[googleStatus]}
          </Alert>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        {connection ? (
          <div className="grid gap-3">
            <div className="rounded-rvmd border border-rv-border bg-rv-bg p-4">
              <p className="text-sm font-bold text-rv-text">
                Connected as {connection.googleEmail || "Google account"}
              </p>
              <HelperText>
                Last updated {new Intl.DateTimeFormat("en", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                }).format(new Date(connection.updatedAt))}
              </HelperText>
            </div>
            <div className="flex flex-wrap gap-3">
              {isConfigured ? (
                <ButtonLink href="/api/integrations/google/connect" variant="ghost">
                  Reconnect Google Drive
                </ButtonLink>
              ) : null}
              <Button
                disabled={isDisconnecting}
                onClick={disconnect}
                type="button"
                variant="ghost"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {isConfigured ? (
              <ButtonLink href="/api/integrations/google/connect">
                Connect Google Drive
              </ButtonLink>
            ) : (
              <Button disabled type="button">
                Connect Google Drive
              </Button>
            )}
            <HelperText>
              {isConfigured
                ? "Google will ask for Drive file access. RoleVector stores OAuth tokens encrypted per user."
                : "Google OAuth credentials are missing from the app environment."}
            </HelperText>
          </div>
        )}
      </div>
    </Panel>
  );
}
