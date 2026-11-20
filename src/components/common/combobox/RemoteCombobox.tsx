"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { Check, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { selectTriggerClasses } from "@/components/ui/select-styles";

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

type OptionSource =
  | { url: string; options?: never }
  | { url?: never; options: RemoteComboboxOption[] };

type Props = OptionSource & {
  value?: string;

  disabled?: boolean;

  placeholder?: string;

  searchPlaceholder?: string;

  emptyMessage?: string;

  onChange: (value: string) => void;
};

export function RemoteCombobox({
  url,
  options: suppliedOptions,
  value,
  disabled,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const listboxId = `remote-combobox-${useId().replaceAll(":", "")}`;

  const [loading, setLoading] = useState(true);

  const [options, setOptions] = useState<RemoteComboboxOption[]>([]);

  useEffect(() => {
    if (!url) return;

    const requestUrl = url;
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(requestUrl);

        const result = await res.json();

        if (!active) return;

        if (result.success) {
          setOptions(result.data);
        }
      } catch {
        if (active) setOptions([]);
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

  const visibleOptions = suppliedOptions ?? options;
  const isLoading = !suppliedOptions && loading;

  const selected = useMemo(
    () => visibleOptions.find((x) => x.id === value),
    [visibleOptions, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(selectTriggerClasses, "cursor-pointer text-left")}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground/70")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "ml-2 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] rounded-xl p-1"
      >
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} />

          <CommandList id={listboxId}>
            {isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>

                <CommandGroup>
                  {visibleOptions.map((option) => (
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
