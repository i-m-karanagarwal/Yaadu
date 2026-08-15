import { NextResponse } from "next/server";
import { routeIntent } from "@/lib/intent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const result = await routeIntent(text);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Intent routing failed";
    console.error("[/api/intent]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
