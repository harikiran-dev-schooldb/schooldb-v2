"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function PageContainer({ children }: Props) {
  return <div className="space-y-6 p-6">{children}</div>;
}
