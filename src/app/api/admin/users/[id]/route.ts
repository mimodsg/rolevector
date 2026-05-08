import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/server/request";
import { requireAdminUser } from "@/lib/server/session";
import { updateUserSchema } from "@/lib/schemas/user";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function badRequest(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The user request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid user data.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  throw error;
}

async function isLastAdmin(userId: string) {
  const adminCount = await prisma.user.count({ where: { role: "Admin" } });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  return user?.role === "Admin" && adminCount <= 1;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminUser();
    assertSameOrigin(request);

    const { id } = await context.params;
    const input = updateUserSchema.parse(await request.json());
    const data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      role?: "Authenticated" | "Admin";
    } = {};

    if (input.name) {
      data.name = input.name;
    }

    if (input.email) {
      data.email = input.email.toLowerCase();
    }

    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, 12);
    }

    if (input.role) {
      if (id === admin.id && input.role !== "Admin") {
        return NextResponse.json(
          { error: "You cannot remove your own admin role." },
          { status: 400 }
        );
      }

      if (input.role !== "Admin" && (await isLastAdmin(id))) {
        return NextResponse.json(
          { error: "At least one admin user must remain." },
          { status: 400 }
        );
      }

      data.role = input.role;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelect
    });

    return NextResponse.json({ user });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdminUser();
    assertSameOrigin(request);
    const { id } = await context.params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    if (await isLastAdmin(id)) {
      return NextResponse.json(
        { error: "At least one admin user must remain." },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return badRequest(error);
  }
}
