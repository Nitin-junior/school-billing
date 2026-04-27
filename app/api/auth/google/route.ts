import { NextRequest, NextResponse } from "next/server";
import {
  signOAuthState,
  googleAuthUrl,
  getAppBaseUrl,
  getGoogleOAuthRedirectUri,
  type OAuthRole,
} from "@/lib/google-oauth";

export async function GET(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL("/login?error=google_not_configured", getAppBaseUrl())
      );
    }

    const roleParam = req.nextUrl.searchParams.get("role") || "parent";
    const role: OAuthRole =
      roleParam === "admin" || roleParam === "teacher" || roleParam === "parent"
        ? roleParam
        : "parent";

    const redirectUri = getGoogleOAuthRedirectUri();
    const state = await signOAuthState(role);
    const url = googleAuthUrl(redirectUri, state);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("Google OAuth start error:", e);
    return NextResponse.json(
      { error: "Failed to start Google sign-in" },
      { status: 500 }
    );
  }
}
