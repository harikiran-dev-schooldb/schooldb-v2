import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (_auth, req) => {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const referer = req.headers.get("referer");

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const segments = refererUrl.pathname.split("/").filter(Boolean);
        const schoolSlug = segments[0];

        if (
          schoolSlug &&
          schoolSlug !== "login" &&
          schoolSlug !== "register" &&
          schoolSlug !== "api"
        ) {
          const requestHeaders = new Headers(req.headers);
          requestHeaders.set("x-school-slug", schoolSlug);

          return NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
        }
      } catch {
        // Ignore malformed referer; requireTenant will reject missing context.
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
