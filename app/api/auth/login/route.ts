import { NextResponse } from "next/server";
import { AUTH_COOKIE, HOUSEHOLD_COOKIE } from "@/lib/auth";
import { ensureDefaultHousehold } from "@/lib/household";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const passcode = typeof body.passcode === "string" ? body.passcode : "";
  const expected = process.env.APP_PASSCODE;

  if (!expected) {
    return NextResponse.json(
      { error: "APP_PASSCODE is not configured on the server" },
      { status: 500 }
    );
  }

  if (passcode !== expected) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const ctx = await ensureDefaultHousehold();

  const response = NextResponse.json({
    ok: true,
    household: ctx.household,
    members: ctx.members,
  });
  response.cookies.set(AUTH_COOKIE, passcode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  response.cookies.set(HOUSEHOLD_COOKIE, ctx.householdId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
