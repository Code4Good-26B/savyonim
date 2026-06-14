import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isWriteGuardEnabled(): boolean {
  const configured = process.env.BLOCK_API_WRITES?.toLowerCase();

  if (configured === "true") return true;
  if (configured === "false") return false;

  // Safe-by-default in development to prevent accidental writes to shared databases.
  return process.env.NODE_ENV !== "production";
}

export function proxy(request: NextRequest) {
  // Authentication and webhook handlers perform their own validation.
  // They must remain reachable while other local API writes are guarded.
  if (
    request.nextUrl.pathname.startsWith("/api/auth/") ||
    request.nextUrl.pathname.startsWith("/api/webhooks/")
  ) {
    return NextResponse.next();
  }

  if (!isWriteGuardEnabled()) {
    return NextResponse.next();
  }

  if (WRITE_METHODS.has(request.method.toUpperCase())) {
    return NextResponse.json(
      {
        error: "Write operations are blocked in this environment.",
        message:
          "Set BLOCK_API_WRITES=false in your local env only when you intentionally need POST/PUT/PATCH/DELETE.",
      },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
