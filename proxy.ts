import { createServerClient } from "@supabase/ssr";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/agent", "/crm", "/insights", "/kpi", "/relance"];
type CookieToSet = { name: string; value: string; options?: Partial<ResponseCookie> };

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/login";
  const requiresAuth = isProtectedPath(pathname);

  if (!isLogin && !requiresAuth) {
    return NextResponse.next();
  }

  let cookiesToSet: CookieToSet[] = [];
  let headersToSet: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(nextCookies, headers) {
          cookiesToSet = nextCookies;
          headersToSet = headers;
          nextCookies.forEach(({ name, value }) => request.cookies.set(name, value));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let response = NextResponse.next({ request });
  if (!user && requiresAuth) {
    response = NextResponse.redirect(new URL("/login", request.url));
  } else if (user && isLogin) {
    response = NextResponse.redirect(new URL("/crm", request.url));
  }

  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(headersToSet).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: ["/agent/:path*", "/crm/:path*", "/insights/:path*", "/kpi/:path*", "/relance/:path*", "/login"],
};
