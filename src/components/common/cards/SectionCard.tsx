"use client";

import { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type Props = {
  children: ReactNode;
};

export function SectionCard({ children }: Props) {
  return <Card className="p-6">{children}</Card>;
}
