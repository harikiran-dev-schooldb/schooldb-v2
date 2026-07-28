"use client";

import { useSchool } from "@/contexts/school-context";

export function AppHeader() {
  const { school, role, user } = useSchool();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold">{school.name}</h2>

        <p className="text-sm text-gray-500">{role}</p>
      </div>

      <div className="text-right">
        <p className="font-medium">
          {user.firstName} {user.lastName}
        </p>

        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
    </header>
  );
}
