import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

/**
 * Returns current session from httpOnly cookie (for Zustand sync after Google OAuth, etc.)
 */
export async function GET() {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({
      authenticated: true,
      name: String(payload.name ?? ""),
      role: String(payload.role ?? "parent") as
        | "admin"
        | "teacher"
        | "parent",
      phone: String(payload.phone ?? ""),
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
