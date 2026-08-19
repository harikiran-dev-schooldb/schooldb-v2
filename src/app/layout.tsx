import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "SchoolDB",
  description: "School Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      {/* Added antialiased and selection colors here for safety */}
      <html
        lang="en"
        className="font-sans antialiased selection:bg-teal-500/30 selection:text-teal-900"
      >
        <body className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col">
          {children}
          {/* Upgraded toaster to match premium feel */}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              className: "glass-panel !border-slate-200/60 !shadow-2xl",
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
