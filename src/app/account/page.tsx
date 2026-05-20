import { AppShell } from "@/components/app-shell";
import { AccountForm } from "@/components/account/account-form";
import { GoogleDriveConnection } from "@/components/account/google-drive-connection";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/server/session";

export default async function AccountPage({
  searchParams
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const user = await requireCurrentUser();
  const { google } = await searchParams;
  const googleConnection = await prisma.googleDriveConnection.findUnique({
    select: {
      googleEmail: true,
      updatedAt: true
    },
    where: { userId: user.id }
  });

  return (
    <AppShell title="Account">
      <div className="grid max-w-2xl gap-6">
        <AccountForm user={user} />
        <GoogleDriveConnection
          connection={
            googleConnection
              ? {
                  googleEmail: googleConnection.googleEmail,
                  updatedAt: googleConnection.updatedAt.toISOString()
                }
              : null
          }
          isConfigured={Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)}
          googleStatus={google}
        />
      </div>
    </AppShell>
  );
}
