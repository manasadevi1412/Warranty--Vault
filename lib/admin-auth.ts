import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "wv_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const ADMIN_EMAIL = "admin@warrantyvault.app";
const ADMIN_PASSWORD = "WarrantyVault@2026";
const SESSION_SECRET = "wv-admin-hmac-7c4f2e1b8a93d6e0f5c2b8a4d6e9f1c3b7a2e8d4f6c1b9a3e7d5f2c8b4a6e1d9";

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || SESSION_SECRET;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", getSecret()).update(payload).digest());
}

export function createAdminSession(email: string): string {
  const body = {
    email,
    exp: Date.now() + SESSION_TTL_MS,
    nonce: randomBytes(8).toString("hex"),
  };
  const payload = base64url(Buffer.from(JSON.stringify(body)));
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyAdminSession(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(fromBase64url(payload).toString("utf8"));
    if (typeof body?.email !== "string") return null;
    if (typeof body?.exp !== "number" || body.exp < Date.now()) return null;
    return { email: body.email };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifyAdminSession(token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_TTL_MS = SESSION_TTL_MS;

export function checkAdminCredentials(email: string, password: string): boolean {
  const e1 = Buffer.from(email.trim().toLowerCase());
  const e2 = Buffer.from(ADMIN_EMAIL.trim().toLowerCase());
  const p1 = Buffer.from(password);
  const p2 = Buffer.from(ADMIN_PASSWORD);
  const emailMatch = e1.length === e2.length && timingSafeEqual(e1, e2);
  const passMatch = p1.length === p2.length && timingSafeEqual(p1, p2);
  return emailMatch && passMatch;
}
