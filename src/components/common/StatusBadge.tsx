import { StudentStatus } from "@/generated/prisma/client";

const colors: Record<StudentStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",

  NOT_COMING: "bg-yellow-100 text-yellow-700",

  INACTIVE: "bg-gray-100 text-gray-700",

  TC_ISSUED: "bg-orange-100 text-orange-700",

  DROPPED: "bg-red-100 text-red-700",

  ALUMNI: "bg-blue-100 text-blue-700",
};

export function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
