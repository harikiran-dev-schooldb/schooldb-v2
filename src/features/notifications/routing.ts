export const SCHOOLDB_PUSH_APP = "SCHOOLDB";

export function supportNotificationPriority(priority: string) {
  return priority.toUpperCase() === "URGENT" ? "URGENT" as const : "NORMAL" as const;
}
