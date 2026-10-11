import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const analyticsSettingsSchema = z.object({
  lowAttendanceThreshold: z.number().min(1).max(100),
  attendanceTarget: z.number().min(1).max(100),
  academicPassTarget: z.number().min(1).max(100),
  monthlyCollectionTarget: z.number().min(0).max(999_999_999_999),
  monthlyExpenseBudget: z.number().min(0).max(999_999_999_999),
  monthlyAdmissionsTarget: z.number().int().min(0).max(1_000_000),
  lateCountsAsPresent: z.boolean(),
  feeOverdueAlertDays: z.number().int().min(1).max(365),
  routeCapacityWarningPercent: z.number().min(50).max(150),
});

export type AnalyticsSettingsInput = z.infer<typeof analyticsSettingsSchema>;

export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettingsInput = {
  lowAttendanceThreshold: 75,
  attendanceTarget: 90,
  academicPassTarget: 75,
  monthlyCollectionTarget: 0,
  monthlyExpenseBudget: 0,
  monthlyAdmissionsTarget: 0,
  lateCountsAsPresent: false,
  feeOverdueAlertDays: 30,
  routeCapacityWarningPercent: 100,
};

function serializeAnalyticsSettings(setting: {
  lowAttendanceThreshold: unknown;
  attendanceTarget: unknown;
  academicPassTarget: unknown;
  monthlyCollectionTarget: unknown;
  monthlyExpenseBudget: unknown;
  monthlyAdmissionsTarget: number;
  lateCountsAsPresent: boolean;
  feeOverdueAlertDays: number;
  routeCapacityWarningPercent: unknown;
}): AnalyticsSettingsInput {
  return {
    lowAttendanceThreshold: Number(setting.lowAttendanceThreshold),
    attendanceTarget: Number(setting.attendanceTarget),
    academicPassTarget: Number(setting.academicPassTarget),
    monthlyCollectionTarget: Number(setting.monthlyCollectionTarget),
    monthlyExpenseBudget: Number(setting.monthlyExpenseBudget),
    monthlyAdmissionsTarget: setting.monthlyAdmissionsTarget,
    lateCountsAsPresent: setting.lateCountsAsPresent,
    feeOverdueAlertDays: setting.feeOverdueAlertDays,
    routeCapacityWarningPercent: Number(setting.routeCapacityWarningPercent),
  };
}

export async function getAnalyticsSettings(schoolId: string) {
  const setting = await prisma.schoolAnalyticsSetting.findUnique({
    where: { schoolId },
  });

  return setting ? serializeAnalyticsSettings(setting) : DEFAULT_ANALYTICS_SETTINGS;
}

export async function saveAnalyticsSettings(
  schoolId: string,
  value: unknown,
) {
  const input = analyticsSettingsSchema.parse(value);
  const setting = await prisma.schoolAnalyticsSetting.upsert({
    where: { schoolId },
    create: { schoolId, ...input },
    update: input,
  });

  return serializeAnalyticsSettings(setting);
}
