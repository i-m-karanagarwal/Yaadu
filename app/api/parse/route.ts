import { NextResponse } from "next/server";
import { parseBillText } from "@/lib/nim";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const parsed = await parseBillText(text);
    return NextResponse.json({ parsed, rawText: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    console.error("[/api/parse]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
