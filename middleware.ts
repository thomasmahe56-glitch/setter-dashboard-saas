import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const isLoginPage = req.nextUrl.pathname === "/login";
  const isPublic = req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/api");

  if (!session && !isLoginPage && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/crm", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
