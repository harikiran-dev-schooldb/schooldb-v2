import { Loader2 } from "lucide-react";

type LoadingProps = {
  text?: string;
};

export function Loading({ text = "Loading..." }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />

      <p className="mt-4 text-muted-foreground">{text}</p>
    </div>
  );
}
