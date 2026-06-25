import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin") || "";
    const host = request.headers.get("host") || "";
    const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL || "", `https://${host}`, `http://${host}`].filter(Boolean);

    if (origin) {
      const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed));
      if (!isAllowed && !AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
        return NextResponse.json({ error: "forbidden", message: "Origine non autorisée." }, { status: 403 });
      }

      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-csrf-token");
      response.headers.set("Access-Control-Max-Age", "86400");
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)",
  ],
};
