import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isWriteGuardEnabled(): boolean {
  const configured = process.env.BLOCK_API_WRITES?.toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth guard for dispatcher routes
  if (pathname.startsWith("/representative") && pathname !== "/representative/login") {
    const token = request.cookies.get("savionim-rep-token")?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/representative/login";
      return NextResponse.redirect(url);
    }
  }

  // Write guard for API routes
  if (pathname.startsWith("/api/")) {
    if (
      pathname.startsWith("/api/auth/") ||
      pathname.startsWith("/api/webhooks/")
    ) {
      return NextResponse.next();
    }

    if (isWriteGuardEnabled() && WRITE_METHODS.has(request.method.toUpperCase())) {
      return NextResponse.json(
        {
          error: "Write operations are blocked in this environment.",
          message:
            "Set BLOCK_API_WRITES=false in your local env only when you intentionally need POST/PUT/PATCH/DELETE.",
        },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/representative/:path*"],
};
