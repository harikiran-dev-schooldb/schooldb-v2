import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

export default function StudentPage() {
  return (
    <>
      <PageHeader
        title="Students"
        description="Manage all students"
        action={<Button>Add Student</Button>}
      />
      Student DataGrid Here
    </>
  );
}
