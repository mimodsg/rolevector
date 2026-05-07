import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/schemas/auth";

export async function POST(request: Request) {
  const input = registerSchema.parse(await request.json());
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
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
      email: input.email.toLowerCase(),
      passwordHash
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  return NextResponse.json({ user }, { status: 201 });
}
