import { AppShell } from "@/components/app-shell";
import { UsersManager } from "@/components/admin/users-manager";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/server/session";

export default async function AdminUsersPage() {
  const currentUser = await requireAdminUser();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });
  const serializedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  }));

  return (
    <AppShell title="Users">
      <UsersManager currentUserId={currentUser.id} initialUsers={serializedUsers} />
    </AppShell>
  );
}
