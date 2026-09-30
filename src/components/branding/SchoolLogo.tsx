"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  schoolName: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  sizes?: string;
  priority?: boolean;
};

export function SchoolLogo({
  src,
  schoolName,
  className,
  imageClassName,
  fallbackClassName,
  sizes = "64px",
  priority = false,
}: Props) {
  const normalizedSrc = src ?? null;
  const [imageState, setImageState] = useState<{
    src: string | null;
    status: "loading" | "ready" | "error";
  }>({
    src: normalizedSrc,
    status: normalizedSrc ? "loading" : "error",
  });
  const state =
    imageState.src === normalizedSrc
      ? imageState.status
      : normalizedSrc
        ? "loading"
        : "error";

  const showImage = Boolean(src) && state !== "error";

  return (
    <div
      role="img"
      aria-label={`${schoolName} logo`}
      data-state={state}
      className={cn(
        "relative isolate flex shrink-0 items-center justify-center overflow-hidden",
        "bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,#eef2ff_48%,#e2e8f0_100%)]",
        "text-indigo-600 ring-1 ring-inset ring-slate-200/80",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.62),transparent_48%,rgba(99,102,241,.06))]"
        aria-hidden="true"
      />

      {showImage ? (
        <Image
          src={src!}
          alt=""
          fill
          sizes={sizes}
          unoptimized
          priority={priority}
          onLoad={() => setImageState({ src: normalizedSrc, status: "ready" })}
          onError={() => setImageState({ src: normalizedSrc, status: "error" })}
          className={cn(
            "relative z-10 object-contain p-[10%] drop-shadow-[0_1px_1px_rgba(15,23,42,.28)] transition-opacity duration-300",
            state === "ready" ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
        />
      ) : (
        <Building2
          className={cn("relative z-10 size-[42%]", fallbackClassName)}
          strokeWidth={1.9}
          aria-hidden="true"
        />
      )}

      {state === "loading" ? (
        <span
          className="absolute inset-0 z-20 animate-pulse bg-gradient-to-br from-slate-100/85 via-white/90 to-indigo-100/75"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
