import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/server/request";
import { requireAdminUser } from "@/lib/server/session";
import { createUserSchema } from "@/lib/schemas/user";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
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

export async function GET() {
  try {
    await requireAdminUser();
    const users = await prisma.user.findMany({
      orderBy: [{ role: "desc" }, { createdAt: "desc" }],
      select: userSelect
    });

    return NextResponse.json({ users });
  } catch (error) {
    return badRequest(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    assertSameOrigin(request);

    const input = createUserSchema.parse(await request.json());
    const email = input.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        role: input.role
      },
      select: userSelect
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return badRequest(error);
  }
}
