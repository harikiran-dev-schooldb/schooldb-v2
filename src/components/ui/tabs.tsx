"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs(props: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex min-h-12 items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const hydrated = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      disabled={!hydrated || disabled}
      className={cn(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold",
        "text-slate-500 transition-all duration-200",
        "hover:text-slate-800",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-white data-[state=active]:text-slate-950",
        "data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200/70",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "mt-5 outline-none",
        "focus-visible:ring-4 focus-visible:ring-primary/10",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
