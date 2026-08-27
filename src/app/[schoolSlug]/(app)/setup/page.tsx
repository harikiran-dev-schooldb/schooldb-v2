"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Layers3,
  School,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

const setupItems = [
  {
    title: "Academic Year",
    description:
      "Configure academic years, dates and the attendance mode used by the school.",
    href: "academicyear",
    icon: CalendarDays,
  },
  {
    title: "Classes",
    description:
      "Create and manage the academic classes available in the school.",
    href: "classes",
    icon: School,
  },
  {
    title: "Sections",
    description:
      "Configure sections under each class and organize their display order.",
    href: "sections",
    icon: Layers3,
  },
];

export default function SchoolSetupPage() {
  const { school } = useSchool();

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="School Setup"
        description="Configure the core academic structure of your school."
      />

      {/* ---------------------------------------------------------------- */}
      {/* School                                                            */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-3xl border-0">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <School className="size-6" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  School
                </p>

                <h2 className="mt-1 text-lg font-bold tracking-tight">
                  {school.name}
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Manage the foundational academic configuration for this
                  school.
                </p>
              </div>
            </div>

            <Badge variant="success" className="w-fit">
              Setup Center
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Setup Items                                                       */}
      {/* ---------------------------------------------------------------- */}

      <div>
        <div className="mb-5">
          <h2 className="text-lg font-bold tracking-tight">Configuration</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Select a setup item to configure or update it.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {setupItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={`/${school.slug}/setup/${item.href}`}
                className="group block"
              >
                <Card className="premium-card h-full overflow-hidden rounded-2xl border-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <CardHeader className="px-6 pb-3 pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-5" />
                      </div>

                      <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>

                    <CardTitle className="pt-3 text-base">
                      {item.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="px-6 pb-6">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">
                      <CheckCircle2 className="size-4" />
                      Manage {item.title}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Setup Information                                                */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <CardTitle className="text-base">Setup Structure</CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoItem
              number="01"
              title="Academic Year"
              description="Academic calendar and attendance configuration."
            />

            <InfoItem
              number="02"
              title="Classes"
              description="Academic classes offered by the school."
            />

            <InfoItem
              number="03"
              title="Sections"
              description="Sections organized under each class."
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Independent Configuration                                        */}
      {/* ---------------------------------------------------------------- */}

      <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5">
        <p className="text-sm font-semibold">
          Setup items can be configured independently.
        </p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Subjects, periods, students and other operational data are managed
          separately through their respective modules and bulk-import tools.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INFO ITEM                                                                  */
/* -------------------------------------------------------------------------- */

function InfoItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-background text-[10px] font-bold text-muted-foreground">
          {number}
        </span>

        <p className="text-sm font-semibold">{title}</p>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
