import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OWNER_COOKIE,
  createOwnerSessionToken,
  isOwnerPinConfigured,
  ownerCookieOptions,
  verifyOwnerPin,
  verifyOwnerSessionToken,
} from "@/lib/owner-auth";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(OWNER_COOKIE)?.value;

  return NextResponse.json({
    configured: isOwnerPinConfigured(),
    authenticated: verifyOwnerSessionToken(token),
  });
}

export async function POST(request: Request) {
  if (!isOwnerPinConfigured()) {
    return NextResponse.json({ ok: true, authenticated: true });
  }

  const body = (await request.json()) as { pin?: string };
  const pin = body.pin?.trim() ?? "";

  if (!verifyOwnerPin(pin)) {
    return NextResponse.json(
      { ok: false, error: "Incorrect PIN." },
      { status: 401 },
    );
  }

  const session = createOwnerSessionToken();
  if (!session) {
    return NextResponse.json({ ok: true, authenticated: true });
  }

  const response = NextResponse.json({ ok: true, authenticated: true });
  response.cookies.set(OWNER_COOKIE, session, ownerCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, authenticated: false });
  response.cookies.set(OWNER_COOKIE, "", { ...ownerCookieOptions(), maxAge: 0 });
  return response;
}
