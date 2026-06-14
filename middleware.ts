import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all dispatcher routes except the login page itself
  if (pathname.startsWith("/dispatcher") && pathname !== "/dispatcher/login") {
    const token = request.cookies.get("savionim-rep-token")?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/dispatcher/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dispatcher/:path*"],
};
