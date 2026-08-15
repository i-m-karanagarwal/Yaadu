import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const checks: Record<string, unknown> = {
    mongodb: { ok: false },
    nvidia: {
      ok: Boolean(process.env.NVIDIA_API_KEY),
      model: process.env.NVIDIA_NIM_MODEL || "meta/llama-3.1-8b-instruct",
      baseUrl: process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
    },
  };

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not set");
    }
    const db = await getDb();
    const ping = await db.command({ ping: 1 });
    const collections = await db.listCollections().toArray();
    checks.mongodb = {
      ok: ping?.ok === 1,
      database: "yaadu",
      collections: collections.map((c) => c.name),
    };
  } catch (err) {
    checks.mongodb = {
      ok: false,
      error: err instanceof Error ? err.message : "MongoDB connection failed",
    };
  }

  const ok =
    (checks.mongodb as { ok?: boolean }).ok === true &&
    (checks.nvidia as { ok?: boolean }).ok === true;

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
