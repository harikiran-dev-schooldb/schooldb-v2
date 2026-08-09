"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/badges";

import { HomeworkDetails as HomeworkDetailsType } from "../types";

type Props = {
  homeworkId: string;
};

export function HomeworkDetails({ homeworkId }: Props) {
  const [data, setData] = useState<HomeworkDetailsType | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const response = await fetch(`/api/v1/homework/${homeworkId}`);

        const result = await response.json();

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setData(result.data);
      } catch {
        toast.error("Failed to load homework.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [homeworkId]);

  if (loading) {
    return <div className="py-10 text-center">Loading homework...</div>;
  }

  if (!data) {
    return <div className="py-10 text-center">Homework not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.title}</h1>

        <p className="text-sm text-muted-foreground">Homework details</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Class</p>

          <p className="font-medium">{data.class.name}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Section</p>

          <p className="font-medium">{data.section?.name ?? "All Sections"}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Assigned Date</p>

          <p className="font-medium">
            {new Date(data.assignedDate).toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Due Date</p>

          <p className="font-medium">
            {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : "-"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-5">
        <p className="mb-2 text-sm font-medium">Description</p>

        <div className="whitespace-pre-line text-sm text-muted-foreground">
          {data.description || "-"}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <span className="text-sm font-medium">Status</span>

        <StatusBadge active={data.active} />
      </div>
    </div>
  );
}
