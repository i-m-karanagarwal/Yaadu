import { NextResponse } from "next/server";
import { HOUSEHOLD_COOKIE } from "@/lib/auth";
import { getMembersCollection } from "@/lib/db";
import { ensureDefaultHousehold, getHouseholdContext } from "@/lib/household";
import type { MemberDocument } from "@/lib/household-document";

export async function GET() {
  try {
    const ctx = await getHouseholdContext();
    return NextResponse.json({
      household: ctx.household,
      members: ctx.members,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load household";
    console.error("[/api/household GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getHouseholdContext();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const roleLabel =
      typeof body.roleLabel === "string" ? body.roleLabel.trim() : "";

    if (!name || !roleLabel) {
      return NextResponse.json(
        { error: "name and roleLabel are required" },
        { status: 400 }
      );
    }

    const membersCol = await getMembersCollection();
    const now = new Date().toISOString();
    const doc: MemberDocument = {
      householdId: ctx.householdId,
      name,
      roleLabel,
      isOwner: false,
      createdAt: now,
    };
    const result = await membersCol.insertOne(doc);

    return NextResponse.json(
      {
        member: {
          _id: result.insertedId.toString(),
          name,
          roleLabel,
          isOwner: false,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add member";
    console.error("[/api/household POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Bootstrap household on login — sets cookie */
export async function PUT() {
  try {
    const ctx = await ensureDefaultHousehold();

    const response = NextResponse.json({
      household: ctx.household,
      members: ctx.members,
    });
    response.cookies.set(HOUSEHOLD_COOKIE, ctx.householdId.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to bootstrap household";
    console.error("[/api/household PUT]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
