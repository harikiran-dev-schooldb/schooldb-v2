import Image from "next/image";
import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/70 to-violet-50 p-6">
      <section className="w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-[0_28px_80px_rgba(30,41,59,0.12)] backdrop-blur-xl">
        <Image
          src="/pwa-192.png"
          alt="SchoolDB"
          width={72}
          height={72}
          className="mx-auto rounded-2xl shadow-lg shadow-indigo-950/15"
          priority
        />
        <div className="mx-auto mt-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <WifiOff className="size-5" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">You are offline</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Reconnect to the internet to load the latest school information.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">Try again</Link>
        </Button>
      </section>
    </main>
  );
}
