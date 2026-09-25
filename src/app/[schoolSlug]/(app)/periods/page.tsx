"use client";

import { PageHeader } from "@/components/common/layout";
import { AddPeriodButton } from "@/features/periods/components/AddPeriodButton";
import { PeriodTable } from "@/features/periods/components/PeriodTable";

export default function PeriodPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Periods"
        description="Configure the teaching periods used by timetables and attendance."
        actions={<AddPeriodButton />}
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <PeriodTable />
      </section>
    </div>
  );
}
