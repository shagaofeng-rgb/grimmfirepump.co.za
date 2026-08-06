import { NextRequest, NextResponse } from "next/server";

/** Keeps GET / as the public home page while forwarding only plugin POSTs. */
export function proxy(request: NextRequest) {
  if (request.method === "POST" && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/api/webhook/send_article", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
