import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  isPublicPath,
  schoolSlugFromPath,
  schoolSlugFromSameOriginReferer,
} from "@/lib/tenant-context";

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicPath(req.nextUrl.pathname)) {
    await auth.protect();
  }

  const pathname = req.nextUrl.pathname;
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
