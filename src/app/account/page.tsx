import { AppShell } from "@/components/app-shell";
import { AccountForm } from "@/components/account/account-form";
import { requireCurrentUser } from "@/lib/server/session";

export default async function AccountPage() {
  const user = await requireCurrentUser();

  return (
    <AppShell title="Account">
      <div className="max-w-2xl">
        <AccountForm user={user} />
      </div>
    </AppShell>
  );
}
