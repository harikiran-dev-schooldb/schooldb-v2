"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigation } from "@/lib/navigation";
import { useSchool } from "@/contexts/school-context";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  const { school } = useSchool();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo */}
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold text-blue-600">SchoolDB</h1>

        <p className="text-sm text-gray-500">{school.name}</p>
      </div>

      {/* Menu */}

      <nav className="flex-1 space-y-2 p-4">
        {navigation.map((item) => {
          const href = `/${school.slug}/${item.href}`;

          const active = pathname === href;

          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 transition-all",

                active ? "bg-blue-600 text-white" : "hover:bg-gray-100",
              )}
            >
              <item.icon className="h-5 w-5" />

              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 text-xs text-gray-500">Version 1.0</div>
    </aside>
  );
}
