import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl;
    const role = request.nextauth.token?.role;

    if (pathname === "/admin/login" && request.nextauth.token) {
      return NextResponse.redirect(
        new URL(role === "LISTENER" ? "/library" : "/admin", request.url)
      );
    }

    if (
      pathname.startsWith("/admin") &&
      pathname !== "/admin/login" &&
      role !== "CREATOR" &&
      role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/library", request.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/admin/login",
    },
    callbacks: {
      authorized: ({ token, req }) =>
        req.nextUrl.pathname === "/admin/login" || Boolean(token),
    },
  }
);

export const config = {
  matcher: ["/admin", "/admin/:path*", "/library", "/feed", "/history"],
};
