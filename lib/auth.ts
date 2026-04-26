import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

const TOKEN_EXPIRY = "8h";
const REFRESH_EXPIRY = "7d";

export interface JWTPayload {
  userId: string;
  role: "admin" | "staff" | "accountant";
  phone: string;
  name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: Pick<JWTPayload, "userId">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookies(res: Response, token: string, refreshToken: string) {
  res.headers.append(
    "Set-Cookie",
    `auth-token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${8 * 3600}`
  );
  res.headers.append(
    "Set-Cookie",
    `refresh-token=${refreshToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
  );
}
