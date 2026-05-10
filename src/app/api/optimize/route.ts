import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Optimization now runs from an application preview. Create applications through /api/applications."
    },
    { status: 410 }
  );
}
