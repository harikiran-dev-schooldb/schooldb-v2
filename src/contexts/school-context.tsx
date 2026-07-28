"use client";

import { createContext, useContext } from "react";
import { SchoolContextType } from "@/types/school";

const SchoolContext = createContext<SchoolContextType | null>(null);

export function SchoolProvider({
  value,
  children,
}: {
  value: SchoolContextType;
  children: React.ReactNode;
}) {
  return (
    <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);

  if (!context) {
    throw new Error("useSchool must be used inside SchoolProvider");
  }

  return context;
}
