import { NextRequest, NextResponse } from "next/server";
import { adminCookie, adminIsConfigured, createSession, verifyPassword, verifyUsername } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json() as { username?: string; password?: string };
  if (!adminIsConfigured()) return NextResponse.json({ error: "Admin environment is not configured." }, { status: 503 });
  if (!username || !password || !verifyUsername(username) || !verifyPassword(password)) return NextResponse.json({ error: "用户名或密码不正确。" }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookie, createSession(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
