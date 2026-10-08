type ExistingAttendanceSession = {
  id: string;
  updatedAt: Date;
  locked: boolean;
  recordCount?: number;
} | null;

export function offlineAttendanceConflict(
  existing: ExistingAttendanceSession,
  expected: {
    sessionId?: string | null;
    baseUpdatedAt?: string | null;
  },
) {
  if (expected.sessionId) {
    if (!existing || existing.id !== expected.sessionId) {
      return "This attendance register changed after the offline copy was saved. Refresh before retrying.";
    }
    if (
      !expected.baseUpdatedAt ||
      existing.updatedAt.toISOString() !== expected.baseUpdatedAt
    ) {
      return "This attendance register was updated on another device. Refresh and review the latest records.";
    }
  } else if (existing && (existing.locked || (existing.recordCount ?? 1) > 0)) {
    return "This attendance register was created on another device. Refresh and review it before finalizing.";
  }

  if (existing?.locked) {
    return "This attendance register is already locked.";
  }

  return null;
}
