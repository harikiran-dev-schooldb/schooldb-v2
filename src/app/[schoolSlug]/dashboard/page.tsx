import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { CalendarCheck, GraduationCap, IndianRupee, Users } from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome to SchoolDB"
        action={<Button>Add Student</Button>}
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Students"
          value={2450}
          icon={GraduationCap}
          description="Active students"
          trend={{
            value: "+15 this month",
            positive: true,
          }}
        />

        <StatCard
          title="Teachers"
          value={120}
          icon={Users}
          description="Teaching staff"
        />

        <StatCard title="Attendance" value="96%" icon={CalendarCheck} />

        <StatCard title="Fees" value="$128,000" icon={IndianRupee} />
      </div>
    </>
  );
}
