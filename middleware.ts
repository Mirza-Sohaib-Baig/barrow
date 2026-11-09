import { NextResponse, type NextRequest } from "next/server";

const sessionCookieName = "barrow_session";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (token) return NextResponse.next();

  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const url = request.nextUrl.clone();
  url.pathname = "/signin";
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/account",
    "/account/:path*",
    "/orders",
    "/orders/:path*",
    "/checkout",
    "/checkout/:path*",
  ],
};
