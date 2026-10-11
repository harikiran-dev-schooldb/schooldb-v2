import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function SchoolDbIdentity({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="SchoolDB home"
      className={cn("inline-flex items-center gap-3", className)}
    >
      <Image
        src="/schooldb-app-logo.png"
        alt=""
        width={44}
        height={44}
        className="size-11 rounded-2xl object-cover shadow-[0_10px_28px_rgba(30,64,175,0.18)]"
      />
      <span>
        <span className="block text-lg font-black tracking-[-0.035em] text-slate-950">
          SchoolDB
        </span>
        <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-600">
          School Operations
        </span>
      </span>
    </Link>
  );
}

export function AuthPolicyLinks({
  message = "Protected account access",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-emerald-600" />
        {message}
      </span>
      <Link href="/security" className="transition hover:text-indigo-600">
        Security
      </Link>
      <Link href="/privacy-policy" className="transition hover:text-indigo-600">
        Privacy
      </Link>
      <Link href="/terms" className="transition hover:text-indigo-600">
        Terms
      </Link>
      <Link href="/contact" className="transition hover:text-indigo-600">
        Help
      </Link>
    </div>
  );
}
