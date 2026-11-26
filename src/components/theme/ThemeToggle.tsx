"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const choices = [
  { value: "light", label: "Light", description: "Bright workspace", icon: Sun },
  { value: "dark", label: "Dark", description: "Low-light workspace", icon: Moon },
  { value: "system", label: "System", description: "Match this device", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme = "system" } = useTheme();
  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Change color theme"
          title="Change color theme"
        >
          <Icon className="size-[18px]" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-60 rounded-2xl p-2">
        <DropdownMenuLabel className="px-3 pb-2 pt-1.5">Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {choices.map(({ value, label, description, icon: ChoiceIcon }) => (
            <DropdownMenuRadioItem key={value} value={value} className="gap-3 rounded-xl py-2.5 pr-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ChoiceIcon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                <span className="block text-[11px] font-normal text-muted-foreground">{description}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
