import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { connectDB } from "@/lib/mongodb";
import Parent from "@/models/Parent";
import User from "@/models/User";
import {
  verifyOAuthState,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getAppBaseUrl,
} from "@/lib/google-oauth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

function loginRedirect(error?: string) {
  const base = getAppBaseUrl();
  const u = new URL("/login", base);
  if (error) u.searchParams.set("error", error);
  return NextResponse.redirect(u);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) {
    return loginRedirect(`google_${oauthError}`);
  }
  if (!code || !state) {
    return loginRedirect("google_missing_code");
  }

  const role = await verifyOAuthState(state);
  if (!role) {
    return loginRedirect("google_invalid_state");
  }

  const base = getAppBaseUrl();
  const redirectUri = `${base}/api/auth/google/callback`;

  let accessToken: string;
  let profile: { email: string; name: string };
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    accessToken = tokens.access_token;
    const g = await fetchGoogleUserInfo(accessToken);
    if (!g.email) {
      return loginRedirect("google_no_email");
    }
    profile = { email: g.email.trim().toLowerCase(), name: g.name || g.email };
  } catch (e) {
    console.error("Google token/profile error:", e);
    return loginRedirect("google_token_failed");
  }

  await connectDB();
  const email = profile.email;

  let phone = "";
  let name = profile.name;
  let parentId: string | undefined;
  let userId: string | undefined;
  let sessionRole: "admin" | "teacher" | "parent" = role;

  if (role === "parent") {
    const parent = await Parent.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
    }).lean() as { _id: unknown; name: string; phone: string } | null;
    if (!parent) {
      return loginRedirect("google_parent_email_not_registered");
    }
    phone = parent.phone;
    name = parent.name || name;
    parentId = String(parent._id);
  } else {
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
      isActive: true,
    }).lean() as { _id: unknown; name: string; phone: string; role: string } | null;
    if (!user) {
      return loginRedirect("google_staff_email_not_registered");
    }
    phone = user.phone;
    name = user.name || name;
    userId = String(user._id);
    if (user.role === "admin") sessionRole = "admin";
    else sessionRole = "teacher";
  }

  const token = await new SignJWT({
    phone,
    role: sessionRole,
    parentId,
    userId,
    name,
    email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const dest = sessionRole === "parent" ? "/parent" : "/dashboard";
  const res = NextResponse.redirect(new URL(dest, base));
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 604800,
    path: "/",
    sameSite: "lax",
  });
  return res;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
