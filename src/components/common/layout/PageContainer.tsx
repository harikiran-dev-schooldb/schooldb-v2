"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function PageContainer({ children }: Props) {
  return <div className="min-w-0 space-y-5 sm:space-y-6 lg:space-y-8">{children}</div>;
}
