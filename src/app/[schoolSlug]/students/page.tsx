import { PageHeader } from "@/components/common/PageHeader";
import { DataGrid } from "@/components/datagrid/DataGrid";
import { Button } from "@/components/ui/button";

import { studentColumns } from "@/features/students/columns";
import { studentService } from "@/features/students/services/student.service";

export default async function StudentPage() {
  const students = await studentService.getAll();

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
