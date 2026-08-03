"use client";

import { useEffect, useMemo, useState } from "react";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type RemoteComboboxOption = {
  id: string;
  label: string;
};

type Props = {
  url: string;

  value?: string;

  disabled?: boolean;

  placeholder?: string;

  searchPlaceholder?: string;

  emptyMessage?: string;

  onChange: (value: string) => void;
};

export function RemoteCombobox({
  url,
  value,
  disabled,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [options, setOptions] = useState<RemoteComboboxOption[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(url);

        const result = await res.json();

        if (!active) return;

        if (result.success) {
          setOptions(result.data);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [url]);

  const selected = useMemo(
    () => options.find((x) => x.id === value),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between"
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>

          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} />

          <CommandList>
            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>

                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.label}
                      onSelect={() => {
                        onChange(option.id);

                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.id ? "opacity-100" : "opacity-0",
                        )}
                      />

                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
