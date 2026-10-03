export type NotificationPreferenceValues = {
  announcements: boolean;
  homework: boolean;
  attendance: boolean;
  fees: boolean;
  exams: boolean;
  leaveUpdates: boolean;
  urgent: boolean;
};

export const defaultNotificationPreferences: NotificationPreferenceValues = {
  announcements: true,
  homework: true,
  attendance: true,
  fees: true,
  exams: true,
  leaveUpdates: true,
  urgent: true,
};

export function notificationPreferenceField(category: string) {
  const normalized = category.toUpperCase();
  if (normalized.includes("HOMEWORK")) return "homework" as const;
  if (normalized.includes("ATTENDANCE")) return "attendance" as const;
  if (normalized.includes("FEE") || normalized.includes("PAYMENT")) return "fees" as const;
  if (normalized.includes("EXAM") || normalized.includes("RESULT")) return "exams" as const;
  if (normalized.includes("LEAVE") || normalized.includes("PERMISSION")) return "leaveUpdates" as const;
  return "announcements" as const;
}

export function notificationEnabled(
  preference: NotificationPreferenceValues | null | undefined,
  category: string,
  priority: string,
) {
  const values = preference ?? defaultNotificationPreferences;
  if (priority.toUpperCase() === "URGENT") return values.urgent;
  return values[notificationPreferenceField(category)];
}
