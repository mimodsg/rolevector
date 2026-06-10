import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { extractApplicationContext } from "@/lib/services/application-context";
import { assertSameOrigin } from "@/lib/server/request";
import { requireCurrentUserId } from "@/lib/server/session";

const contextSchema = z.object({
  companyUrl: z.union([z.string().url("Enter a valid URL."), z.literal("")]).optional().default(""),
  jobApplicationUrl: z
    .union([z.string().url("Enter a valid URL."), z.literal("")])
    .optional()
    .default("")
});

function apiError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { error: error.statusText || "The context request was not allowed." },
      { status: error.status || 500 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid context data.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  throw error;
}

export async function POST(request: Request) {
  try {
    await requireCurrentUserId();
    assertSameOrigin(request);
    const { companyUrl, jobApplicationUrl } = contextSchema.parse(await request.json());
    const applicationContext = await extractApplicationContext({
      companyUrl,
      jobApplicationUrl
    });

    return NextResponse.json({ applicationContext });
  } catch (error) {
    return apiError(error);
  }
}
