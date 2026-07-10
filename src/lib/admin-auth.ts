import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "grimm_africa_admin";
const encoder = new TextEncoder();
function secret(): string { return process.env.ADMIN_SESSION_SECRET ?? ""; }

export function adminIsConfigured(): boolean { return Boolean(process.env.ADMIN_PASSWORD && secret()); }
export function verifyPassword(value: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || value.length !== expected.length) return false;
  return timingSafeEqual(encoder.encode(value), encoder.encode(expected));
}
export function createSession(): string { return createHmac("sha256", secret()).update("grimm-africa-admin").digest("hex"); }
export async function isAdmin(): Promise<boolean> {
  if (!adminIsConfigured()) return false;
  const current = (await cookies()).get(cookieName)?.value;
  const expected = createSession();
  return Boolean(current && current.length === expected.length && timingSafeEqual(encoder.encode(current), encoder.encode(expected)));
}
export const adminCookie = cookieName;
