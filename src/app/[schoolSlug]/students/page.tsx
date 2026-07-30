import { PageHeader } from "@/components/common/PageHeader";
import { DataGrid } from "@/components/datagrid/DataGrid";
import { Button } from "@/components/ui/button";

import { studentColumns } from "@/features/students/columns";
import { studentService } from "@/features/students/services/student.service";
import { requireTenant } from "@/lib/auth";

export default async function StudentPage() {
  const tenant = await requireTenant();
  const students = await studentService.getAll(tenant.schoolId);

  return (
    <>
      <PageHeader
        title="Students"
        description="Manage all students"
        action={<Button>Add Student</Button>}
      />

      <DataGrid columns={studentColumns} data={students} />
    </>
  );
}
