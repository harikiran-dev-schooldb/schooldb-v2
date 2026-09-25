import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { PwaRegistration } from "@/components/pwa/PwaRegistration";

export const metadata: Metadata = {
  title: {
    default: "SchoolDB",
    template: "%s | SchoolDB",
  },
  description: "Modern school management platform",
  applicationName: "SchoolDB",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SchoolDB",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        data-scroll-behavior="smooth"
        suppressHydrationWarning
        className="font-sans antialiased"
      >
        <body className="flex min-h-screen flex-col bg-background text-foreground">
          {children}

          <PwaRegistration />

          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              className:
                "rounded-2xl border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl",
            }}
          />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
