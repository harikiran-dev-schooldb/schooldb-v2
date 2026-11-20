/**
 * Shared trigger styling for Radix Select and searchable comboboxes.
 * Keep the same silhouette across SchoolDB form controls.
 */
export const selectTriggerClasses = [
  "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 sm:h-10",
  "text-base font-normal text-foreground shadow-sm outline-none transition-all duration-200 sm:text-sm",
  "hover:border-primary/25",
  "focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10",
  "data-[state=open]:border-primary/50 data-[state=open]:ring-4 data-[state=open]:ring-primary/10",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");
