import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Admin route protection (milestone M5) — runs before every request.
 *
 * Purpose: redirect UNAUTHENTICATED visitors away from /admin/* to
 * /admin/login (keeping ?next= so login can return them where they were).
 *
 * Security model:
 *   * The middleware is a UX layer only. The authoritative gates are the
 *     admin panel layout (server components) and every server action, which
 *     re-verify session + profiles.role='admin' via getAdminSession().
 *   * When Supabase is not configured the middleware lets every request
 *     through: the panel pages render their honest "configurazione non
 *     disponibile" empty state and the build stays green without env vars.
 *
 * Note (Next.js 16): the `middleware` file convention is deprecated and
 * renamed to `proxy`; both are still recognized by 16.3.4 (isMiddlewareFilename
 * accepts 'middleware' and 'proxy'). We keep `middleware.ts` as requested;
 * migrating to proxy.ts is a one-line file/export rename when desired.
 */

// Matcher: only /admin/*. Root-level assets (_next/static, _next/image,
// favicon.ico, images/) never match, so they are excluded implicitly.
// /admin/login is allowed through inside the handler (it renders the form).
export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only /admin routes are protected.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  // The login page is public: it shows the form (and redirects to /admin
  // client-side when a session already exists).
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  // Not configured → pass through; the panel shows the honest empty state.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() (not getSession()) — it validates the token with
  // the auth server instead of trusting the decoded JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
}