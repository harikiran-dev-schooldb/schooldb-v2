import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "SchoolDB",
    template: "%s | SchoolDB",
  },
  description: "Modern school management platform",
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
        suppressHydrationWarning
        className="font-sans antialiased"
      >
        <body className="flex min-h-screen flex-col bg-background text-foreground">
          {children}

          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              className:
                "rounded-2xl border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl",
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
