import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { shouldUseSecureCookie } from "./cookie";

const COOKIE = "webfoto_admin";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "development-secret-change-me");

export async function createSession(username: string) {
  const token = await new SignJWT({ username }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: shouldUseSecureCookie({ nodeEnv: process.env.NODE_ENV, appUrl: process.env.APP_URL, override: process.env.COOKIE_SECURE }), path: "/", maxAge: 8 * 60 * 60 });
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret)).payload as { username?: string }; } catch { return null; }
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.username) throw new Error("UNAUTHORIZED");
  return session;
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
