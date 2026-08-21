export function DataGridLoading() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3">
      <div className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />

      <p className="text-sm font-medium text-muted-foreground">
        Loading records...
      </p>
    </div>
  );
}
