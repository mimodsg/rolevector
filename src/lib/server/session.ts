import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireCurrentUserId() {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
  }

  return userId;
}

export async function requireCurrentUser() {
  const userId = await requireCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  if (!user) {
    throw new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (user.role !== "Admin") {
    throw new Response("Forbidden", { status: 403, statusText: "Forbidden" });
  }

  return user;
}
