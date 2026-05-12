import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { updateAccountSchema } from "@/lib/schemas/user";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";

const accountSelect = {
  id: true,
  name: true,
  email: true,
  role: true
};

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The account request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid account data.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  throw error;
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    assertSameOrigin(request);
    const input = updateAccountSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      input.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    const email = input.email.toLowerCase();

    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        name: input.name,
        ...(input.newPassword
          ? { passwordHash: await bcrypt.hash(input.newPassword, 12) }
          : {})
      },
      select: accountSelect
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return apiError(error);
  }
}
