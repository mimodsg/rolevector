import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Public registration is disabled. Ask an admin to create your account." },
    { status: 403 }
  );
}
