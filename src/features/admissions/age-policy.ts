export type AgeRule = { minMonths: number; maxMonths: number };
export type AdmissionAgePolicy = { ageAsOfDate: string; rules: Record<string, AgeRule> };

export function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Completed calendar months, using UTC dates to avoid deployment timezone drift. */
export function completedAgeMonths(dob: string, cutoff: string): number | null {
  if (!validCalendarDate(dob) || !validCalendarDate(cutoff) || dob > cutoff) return null;
  const birth = new Date(dob + "T00:00:00Z");
  const end = new Date(cutoff + "T00:00:00Z");
  return (end.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    end.getUTCMonth() - birth.getUTCMonth() -
    (end.getUTCDate() < birth.getUTCDate() ? 1 : 0);
}

export function assessAge(dob: string, policy: AdmissionAgePolicy | null | undefined, classId: string) {
  const rule = policy?.rules[classId];
  if (!policy || !rule) return { status: "UNCONFIGURED" as const, months: null };
  const months = completedAgeMonths(dob, policy.ageAsOfDate);
  if (months === null) return { status: "INVALID_DATE" as const, months };
  return { status: months >= rule.minMonths && months <= rule.maxMonths ? "ELIGIBLE" as const : "INELIGIBLE" as const, months };
}

export function calculateExactAge(dob: string, cutoff: string) {
  const totalMonths = completedAgeMonths(dob, cutoff);
  if (totalMonths === null) return null;
  const birth = new Date(dob + "T00:00:00Z");
  const anchor = new Date(Date.UTC(birth.getUTCFullYear(), birth.getUTCMonth() + totalMonths, 1));
  const lastDay = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
  anchor.setUTCDate(Math.min(birth.getUTCDate(), lastDay));
  const days = Math.round((new Date(cutoff + "T00:00:00Z").getTime() - anchor.getTime()) / 86400000);
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, days, totalMonths };
}
export function eligibleClassIds(dob: string, policy: AdmissionAgePolicy | null | undefined) {
  if (!policy) return [];
  return Object.keys(policy.rules).filter(id => assessAge(dob, policy, id).status === "ELIGIBLE");
}
