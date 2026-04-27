import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export type OAuthRole = "admin" | "teacher" | "parent";

export async function signOAuthState(role: OAuthRole): Promise<string> {
  return new SignJWT({ role, purpose: "google-oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyOAuthState(
  state: string
): Promise<OAuthRole | null> {
  try {
    const { payload } = await jwtVerify(state, secret);
    if (payload.purpose !== "google-oauth") return null;
    const r = payload.role as string;
    if (r === "admin" || r === "teacher" || r === "parent") return r;
    return null;
  } catch {
    return null;
  }
}

/**
 * Canonical site URL for OAuth redirects. Order matters on Vercel:
 * - APP_BASE_URL: optional explicit canonical URL (custom domain).
 * - VERCEL_URL: runtime deployment host (avoids NEXT_PUBLIC_* baked at build time mismatching token exchange).
 * - NEXT_PUBLIC_APP_URL: local / static deploys.
 */
export function getAppBaseUrl(): string {
  const trimEnd = (s: string) => s.trim().replace(/\/$/, "");
  if (process.env.APP_BASE_URL?.trim()) {
    return trimEnd(process.env.APP_BASE_URL);
  }
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return trimEnd(process.env.NEXT_PUBLIC_APP_URL);
  }
  return "http://localhost:3000";
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ access_token: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token exchange failed: ${t}`);
  }
  const data = (await res.json()) as { access_token: string };
  return { access_token: data.access_token };
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture?: string;
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google profile");
  return res.json() as Promise<GoogleUserInfo>;
}
