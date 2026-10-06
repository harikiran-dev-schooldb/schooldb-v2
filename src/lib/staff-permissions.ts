import { resolveConfiguredRoute } from "./route-access.ts";

export const STAFF_PERMISSION_MODULES = [
  { key: "DASHBOARD", label: "Dashboard", description: "School overview and summary metrics" },
  { key: "STUDENTS", label: "Students", description: "Student records, enrollments, ID cards and certificates" },
  { key: "ADMISSIONS", label: "Admissions", description: "Online applications and admission processing" },
  { key: "ATTENDANCE", label: "Attendance", description: "Student attendance and attendance reports" },
  { key: "LEARNING", label: "Learning", description: "Homework, exams, results and toppers" },
  { key: "FEES", label: "Fees & Accounts", description: "Fees, collections, receipts, plans and expenses" },
  { key: "TIMETABLE", label: "Timetable", description: "Timetables and school periods" },
  { key: "ACADEMICS", label: "Academic Setup", description: "Teachers, classes, subjects and allocations" },
  { key: "REPORTS", label: "Reports & Analytics", description: "Management reports, exports and analytics" },
  { key: "STAFF", label: "Staff & Payroll", description: "Staff attendance, salaries and payroll" },
  { key: "FRONT_OFFICE", label: "Front Office", description: "Visitors, health, pickup and maintenance desks" },
  { key: "INVENTORY", label: "Inventory", description: "Inventory items, stock and school assets" },
  { key: "LIBRARY", label: "Library", description: "Books, copies and lending operations" },
  { key: "TRANSPORT", label: "Transport", description: "Vehicles, routes, stops and assignments" },
  { key: "CALENDAR", label: "Calendar & Leave", description: "School calendar and leave requests" },
  { key: "COMMUNICATION", label: "Communication", description: "Notifications and WhatsApp communication" },
  { key: "SUPPORT", label: "Queries & Support", description: "Staff support and parent queries" },
] as const;

export type StaffPermissionModule = (typeof STAFF_PERMISSION_MODULES)[number]["key"];
export type StaffAccessLevel = "NONE" | "VIEW" | "MANAGE";

export type StaffPermissionMembership = {
  role: string;
  customPermissionsEnabled: boolean;
  permissions: readonly string[];
};

const MODULE_KEYS = new Set<string>(STAFF_PERMISSION_MODULES.map((module) => module.key));
const LEVEL_WEIGHT: Record<StaffAccessLevel, number> = { NONE: 0, VIEW: 1, MANAGE: 2 };

const DEFAULT_ROLE_LEVELS: Record<string, Partial<Record<StaffPermissionModule, StaffAccessLevel>>> = {
  TEACHER: {
    STUDENTS: "VIEW",
    ATTENDANCE: "MANAGE",
    LEARNING: "VIEW",
    TIMETABLE: "VIEW",
    CALENDAR: "VIEW",
    COMMUNICATION: "VIEW",
    SUPPORT: "VIEW",
  },
  ACCOUNTANT: {
    DASHBOARD: "VIEW",
    STUDENTS: "VIEW",
    FEES: "MANAGE",
    STAFF: "MANAGE",
    INVENTORY: "MANAGE",
    SUPPORT: "VIEW",
  },
  RECEPTIONIST: {
    DASHBOARD: "VIEW",
    STUDENTS: "MANAGE",
    ADMISSIONS: "MANAGE",
    FRONT_OFFICE: "MANAGE",
    SUPPORT: "VIEW",
  },
};

const ROUTE_MODULES: Partial<Record<string, StaffPermissionModule>> = {
  dashboard: "DASHBOARD",
  students: "STUDENTS",
  enrollments: "STUDENTS",
  "student-houses": "STUDENTS",
  birthdays: "STUDENTS",
  "id-cards": "STUDENTS",
  certificates: "STUDENTS",
  admissions: "ADMISSIONS",
  attendance: "ATTENDANCE",
  "attendance/dashboard": "ATTENDANCE",
  "attendance/history": "ATTENDANCE",
  "attendance/reports/class": "ATTENDANCE",
  "attendance/reports/student": "ATTENDANCE",
  "attendance/reports/low": "ATTENDANCE",
  "attendance/ranking": "ATTENDANCE",
  homework: "LEARNING",
  exams: "LEARNING",
  toppers: "LEARNING",
  "fees/dashboard": "FEES",
  "fees/collection": "FEES",
  "fees/outstanding": "FEES",
  "fees/payments": "FEES",
  "fees/upi-verification": "FEES",
  "fees/receipts": "FEES",
  expenses: "FEES",
  "fees/plans": "FEES",
  "fees/categories": "FEES",
  timetable: "TIMETABLE",
  "timetable/daily": "TIMETABLE",
  "timetable/class": "TIMETABLE",
  "timetable/teacher": "TIMETABLE",
  periods: "TIMETABLE",
  teachers: "ACADEMICS",
  "academic-year": "ACADEMICS",
  "setup/academic-structure": "ACADEMICS",
  classes: "ACADEMICS",
  sections: "ACADEMICS",
  subjects: "ACADEMICS",
  "setup/class-subjects": "ACADEMICS",
  "teacher-allocations": "ACADEMICS",
  "class-teachers": "ACADEMICS",
  reports: "REPORTS",
  "management-analytics": "REPORTS",
  "staff-operations": "STAFF",
  visitors: "FRONT_OFFICE",
  "student-health": "FRONT_OFFICE",
  "student-pickup": "FRONT_OFFICE",
  maintenance: "FRONT_OFFICE",
  inventory: "INVENTORY",
  library: "LIBRARY",
  transport: "TRANSPORT",
  calendar: "CALENDAR",
  "leave-requests": "CALENDAR",
  notifications: "COMMUNICATION",
  whatsapp: "COMMUNICATION",
  queries: "SUPPORT",
  "parent-queries": "SUPPORT",
};

const API_MODULES: Array<[string, readonly StaffPermissionModule[]]> = [
  ["/api/v1/attendance", ["ATTENDANCE"]],
  ["/api/v1/fees", ["FEES"]],
  ["/api/v1/fee-", ["FEES"]],
  ["/api/v1/student-fees", ["FEES"]],
  ["/api/v1/student-fee-", ["FEES"]],
  ["/api/v1/direct-upi", ["FEES"]],
  ["/api/v1/students/options", ["STUDENTS", "ADMISSIONS", "ACADEMICS"]],
  ["/api/v1/students", ["STUDENTS"]],
  ["/api/v1/admissions", ["ADMISSIONS"]],
  ["/api/v1/student-enrollments", ["STUDENTS"]],
  ["/api/v1/houses", ["STUDENTS"]],
  ["/api/v1/birthdays", ["STUDENTS"]],
  ["/api/v1/id-card", ["STUDENTS"]],
  ["/api/v1/certificate", ["STUDENTS"]],
  ["/api/v1/teachers/options", ["ACADEMICS", "TIMETABLE"]],
  ["/api/v1/teachers", ["ACADEMICS"]],
  ["/api/v1/teacher-allocations", ["ACADEMICS"]],
  ["/api/v1/class-teachers", ["ACADEMICS"]],
  ["/api/v1/classes", ["ACADEMICS"]],
  ["/api/v1/sections", ["ACADEMICS"]],
  ["/api/v1/subjects", ["ACADEMICS"]],
  ["/api/v1/syllabi", ["ACADEMICS"]],
  ["/api/v1/academic-", ["ACADEMICS"]],
  ["/api/v1/periods", ["TIMETABLE"]],
  ["/api/v1/timetables", ["TIMETABLE"]],
  ["/api/v1/homework", ["LEARNING"]],
  ["/api/v1/exam", ["LEARNING"]],
  ["/api/v1/library", ["LIBRARY"]],
  ["/api/v1/transport", ["TRANSPORT"]],
  ["/api/v1/notifications", ["COMMUNICATION"]],
  ["/api/v1/support/tickets", ["SUPPORT"]],
  ["/api/v1/operations", ["STAFF", "FRONT_OFFICE", "INVENTORY", "REPORTS"]],
  ["/api/v1/dashboard", ["DASHBOARD"]],
  ["/api/v1/report", ["REPORTS"]],
];

export function encodeStaffPermission(module: StaffPermissionModule, level: Exclude<StaffAccessLevel, "NONE">) {
  return `${module}:${level}`;
}

export function normalizeStaffPermissions(value: unknown) {
  if (!Array.isArray(value)) return [];
  const levels = new Map<StaffPermissionModule, Exclude<StaffAccessLevel, "NONE">>();

  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const [module, level] = entry.split(":");
    if (!MODULE_KEYS.has(module) || !["VIEW", "MANAGE"].includes(level)) continue;
    levels.set(module as StaffPermissionModule, level as "VIEW" | "MANAGE");
  }

  return [...levels].map(([module, level]) => encodeStaffPermission(module, level));
}

export function permissionLevelFor(
  membership: StaffPermissionMembership,
  module: StaffPermissionModule,
): StaffAccessLevel {
  if (["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(membership.role)) return "MANAGE";
  if (!membership.customPermissionsEnabled) {
    return DEFAULT_ROLE_LEVELS[membership.role]?.[module] ?? "NONE";
  }

  const permission = normalizeStaffPermissions(membership.permissions).find((entry) =>
    entry.startsWith(`${module}:`),
  );
  return (permission?.split(":")[1] as StaffAccessLevel | undefined) ?? "NONE";
}

export function hasModuleAccess(
  membership: StaffPermissionMembership,
  module: StaffPermissionModule,
  required: Exclude<StaffAccessLevel, "NONE"> = "VIEW",
) {
  return LEVEL_WEIGHT[permissionLevelFor(membership, module)] >= LEVEL_WEIGHT[required];
}

export function moduleForRoute(href?: string) {
  return href ? ROUTE_MODULES[href] : undefined;
}

export function permissionModulesForRequestPath(pathname: string | null, schoolSlug: string) {
  if (!pathname) return [];
  if (pathname.startsWith(`/${schoolSlug}/`)) {
    const route = resolveConfiguredRoute(pathname.slice(schoolSlug.length + 2));
    const permissionModule = moduleForRoute(route);
    return permissionModule ? [permissionModule] : [];
  }

  return (
    API_MODULES.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(prefix.endsWith("-") ? prefix : `${prefix}/`) || pathname.startsWith(prefix),
    )?.[1] ?? []
  );
}

export function requiredAccessLevel(method: string | null) {
  return !method || method === "GET" || method === "HEAD" ? "VIEW" : "MANAGE";
}
