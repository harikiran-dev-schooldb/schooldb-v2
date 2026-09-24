import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  isPublicPath,
  schoolSlugFromPath,
  schoolSlugFromSameOriginReferer,
} from "@/lib/tenant-context";

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
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
    await auth.protect();
  }

  const requestHeaders = new Headers(req.headers);

  if (pathname.startsWith("/api/")) {
    if (!requestHeaders.has("x-school-slug")) {
      const schoolSlug = schoolSlugFromSameOriginReferer(
        req.headers.get("referer"),
        req.nextUrl.origin,
      );

      if (schoolSlug) requestHeaders.set("x-school-slug", schoolSlug);
    }
  } else {
    const schoolSlug = schoolSlugFromPath(pathname);

    if (schoolSlug) requestHeaders.set("x-school-slug", schoolSlug);
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
