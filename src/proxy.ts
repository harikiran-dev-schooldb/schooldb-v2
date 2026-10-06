import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  isPublicPath,
  schoolSlugFromPath,
  schoolSlugFromSameOriginReferer,
} from "@/lib/tenant-context";
import {
  isSchoolDbProductionHost,
  SCHOOLDB_PRODUCTION_DOMAIN,
} from "@/lib/production-domain";

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Deployment URLs are useful for Vercel internally, but users and installed
  // service workers must always use the canonical SchoolDB domain.
  if (
    req.nextUrl.hostname.toLowerCase().endsWith(".vercel.app")
    && !isSchoolDbProductionHost(req.nextUrl.hostname)
    && !pathname.startsWith("/api/")
  ) {
    const canonicalUrl = req.nextUrl.clone();
    canonicalUrl.protocol = "https:";
    canonicalUrl.hostname = SCHOOLDB_PRODUCTION_DOMAIN;
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const isSupportApi = pathname.startsWith("/api/v1/support/");
  const isAndroidBuildWorkerApi =
    /^\/api\/v1\/android-builds\/[^/]+\/(?:source|callback)$/.test(pathname);

  /*
   * Native support APIs and Android build worker callbacks authenticate inside
   * their handlers. Clerk can turn a protected non-browser request into its
   * navigation/handshake flow before Next.js reaches the API route. Middleware
   * still runs, so each route can verify its Clerk or one-time Bearer token.
   */
  if (!isPublicPath(pathname) && !isSupportApi && !isAndroidBuildWorkerApi) {
    if (pathname.startsWith("/api/")) {
      // Return an explicit API response instead of allowing auth.protect() to
      // throw. Some serverless runtimes surface that 401 exception as a 500,
      // which is both misleading to clients and noisy in production logs.
      const { isAuthenticated } = await auth();

      if (!isAuthenticated) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 },
        );
      }
    } else {
      const schoolSlug = schoolSlugFromPath(pathname);

      await auth.protect({
        unauthenticatedUrl: new URL(
          schoolSlug ? `/${schoolSlug}/login` : "/choose-school",
          req.url,
        ).toString(),
      });
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-school-method", req.method);

  if (pathname.startsWith("/api/")) {
    requestHeaders.set("x-school-pathname", pathname);
    if (!requestHeaders.has("x-school-slug")) {
      const schoolSlug = schoolSlugFromSameOriginReferer(
        req.headers.get("referer"),
        req.nextUrl.origin,
      );

      if (schoolSlug) requestHeaders.set("x-school-slug", schoolSlug);
    }
  } else {
    const schoolSlug = schoolSlugFromPath(pathname);

    if (schoolSlug) {
      requestHeaders.set("x-school-slug", schoolSlug);
      requestHeaders.set("x-school-pathname", pathname);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/", "/(api|trpc)(.*)"],
};
