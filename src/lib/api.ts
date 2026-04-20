import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export async function parseJson<T>(req: Request, schema: ZodSchema<T>) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false as const, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { ok: true as const, data: parsed.data };
}

export function httpError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function httpOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
