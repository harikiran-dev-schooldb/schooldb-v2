import { Badge } from "@/components/ui/badge";

type Props = {
  status: string;
};

export function StatusBadge({ status }: Props) {
  switch (status) {
    case "ACTIVE":
      return <Badge>Active</Badge>;

    case "TC_ISSUED":
      return <Badge variant="secondary">TC Issued</Badge>;

    case "ALUMNI":
      return <Badge variant="outline">Alumni</Badge>;

    case "DROPPED":
      return <Badge variant="destructive">Dropped</Badge>;

    case "NOT_COMING":
      return <Badge variant="secondary">Not Coming</Badge>;

    case "INACTIVE":
      return <Badge variant="secondary">Inactive</Badge>;

    default:
      return <Badge>{status}</Badge>;
  }
}
