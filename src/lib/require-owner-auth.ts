import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  isOwnerPinConfigured,
  verifyOwnerSessionToken,
  OWNER_COOKIE,
} from "@/lib/owner-auth";

export async function requireOwnerAuth(): Promise<NextResponse | null> {
  if (!isOwnerPinConfigured()) return null;

  const jar = await cookies();
  if (verifyOwnerSessionToken(jar.get(OWNER_COOKIE)?.value)) return null;

  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
