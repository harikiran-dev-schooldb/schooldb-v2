"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Exam = {
  id: string;

  name: string;

  startDate: string;
  endDate: string;

  academicYear: {
    id: string;
    name: string;
  };

  _count: {
    schedules: number;
  };
};

type Props = {
  onCreate?: () => void;
  onEdit?: (exam: Exam) => void;
  onDelete?: (exam: Exam) => void;
  schoolSlug: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ExamList({ schoolSlug, onCreate, onEdit, onDelete }: Props) {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/exams", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load exams.");
      }

      setExams(result.data ?? []);
    } catch (error) {
      console.error("Failed to load exams:", error);

      setError(
        error instanceof Error ? error.message : "Failed to load exams.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadExams();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadExams]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading exams...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <p className="text-sm text-destructive">{error}</p>

          <Button variant="outline" onClick={() => void loadExams()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground" />

          <div>
            <h3 className="font-semibold">No exams found</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Create your first exam to start managing examination schedules.
            </p>
          </div>

          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void loadExams()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exams.map((exam) => (
          <Card
            key={exam.id}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => {
              router.push(`/${schoolSlug}/exams/${exam.id}`);
            }}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{exam.name}</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {exam.academicYear.name}
                  </p>
                </div>

                <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Start</span>

                  <span className="font-medium">
                    {formatDate(exam.startDate)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">End</span>

                  <span className="font-medium">
                    {formatDate(exam.endDate)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    Subjects Scheduled
                  </span>

                  <span className="font-medium">{exam._count.schedules}</span>
                </div>
              </div>

              <div className="mt-5 flex gap-2 border-t pt-4">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(exam);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}

                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(exam);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
