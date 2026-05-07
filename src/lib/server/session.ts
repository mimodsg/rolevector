import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireCurrentUserId() {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return userId;
}
