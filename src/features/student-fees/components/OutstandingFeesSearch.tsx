"use client";

import { Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
};

export function OutstandingFeesSearch({
  value,
  loading = false,
  onChange,
  onSearch,
}: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearch();
                }
              }}
              placeholder="Search student or admission number..."
              className="pl-9"
            />
          </div>

          <Button onClick={onSearch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
