"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { followUpStudentName, formatFollowUpDate, type FollowUpList } from "../follow-up-ui";
import { useFollowUpData } from "../use-follow-up-data";

export function TeacherFollowUpsPanel({ schoolSlug }: { schoolSlug: string }) {
  const [revision, setRevision] = useState(0);
  const result = useFollowUpData<FollowUpList>("/api/v1/student-follow-ups?scope=week", revision);
  const due = result?.data?.followUps.slice(0, 5) ?? [];

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList aria-hidden="true" className="size-5 text-primary" />
            Student follow-ups due this week
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${schoolSlug}/student-follow-ups`}>View my follow-ups<ArrowRight aria-hidden="true" className="size-4" /></Link>
          </Button>
        </div>
        {!result ? (
          <p className="mt-3 text-sm text-muted-foreground" role="status">Loading follow-ups…</p>
        ) : result.error ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-destructive" role="alert">{result.error}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRevision((value) => value + 1)}>Try again</Button>
          </div>
        ) : due.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No open follow-ups due this week.</p>
        ) : (
          <>
            <ul className="mt-3 list-none divide-y" aria-label="Follow-ups due this week">
              {due.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{followUpStudentName(item.student)}</p>
                    <p className="break-words text-muted-foreground">{item.nextAction}</p>
                  </div>
                  <time dateTime={item.dueDate} className="font-medium tabular-nums">{formatFollowUpDate(item.dueDate)}</time>
                </li>
              ))}
            </ul>
            {result.data && result.data.total > due.length && (
              <p className="mt-1 text-sm text-muted-foreground">Showing {due.length} of {result.data.total} due this week.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
