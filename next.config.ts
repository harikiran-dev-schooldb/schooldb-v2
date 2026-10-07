import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["*.trycloudflare.com"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(), payment=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://*.cashfree.com; worker-src 'self' blob:; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.schooldb.co.in https://*.clerk.com https://*.clerk.accounts.dev https://sdk.cashfree.com; connect-src 'self' https://clerk.schooldb.co.in https://*.clerk.com https://*.clerk.accounts.dev https://*.googleapis.com https://*.firebaseio.com https://fcmregistrations.googleapis.com https://*.cashfree.com; frame-src 'self' https://clerk.schooldb.co.in https://*.clerk.com https://*.clerk.accounts.dev https://*.cashfree.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
