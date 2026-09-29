import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.blob.vercel-storage.com",
      },
    ],
  },
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
            key: "Content-Security-Policy-Report-Only",
            value: "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; worker-src 'self' blob:; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://sdk.cashfree.com; connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.googleapis.com https://*.firebaseio.com https://fcmregistrations.googleapis.com https://api.cashfree.com https://sandbox.cashfree.com; frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://sdk.cashfree.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
