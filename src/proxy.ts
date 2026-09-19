import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

const constructionPassthrough = [
  "/admin",
  "/api",
  "/_next",
  "/under-construction",
  "/images",
  "/logo",
];

export function isConstructionTarget(pathname: string) {
  return !constructionPassthrough.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    process.env.UNDER_CONSTRUCTION === "true" &&
    isConstructionTarget(pathname)
  ) {
    const holdingPage = request.nextUrl.clone();
    holdingPage.pathname = "/under-construction";
    holdingPage.search = "";
    const response = NextResponse.rewrite(holdingPage);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  if (pathname !== "/admin" && !pathname.startsWith("/admin/"))
    return NextResponse.next();

  const { url, key } = getSupabasePublicEnv();
  let response = NextResponse.next({ request });
  const client = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|images|logo|favicon.ico|robots.txt|sitemap.xml|.*\\.[^/]+$).*)",
  ],
};
