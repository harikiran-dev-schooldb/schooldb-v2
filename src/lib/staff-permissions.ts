import { isRouteAllowed, resolveConfiguredRoute, type RouteAccessConfig } from "./route-access.ts";

export const STAFF_PERMISSION_MODULES = [
  { key: "DASHBOARD", label: "Dashboard", description: "School overview and summary metrics" },
  { key: "STUDENTS", label: "Student Directory", description: "Student profiles and directory access" },
  { key: "STUDENT_RECORDS", label: "Student Records", description: "Enrollments, houses and birthday records" },
  { key: "STUDENT_IDS", label: "Student ID Cards", description: "Student identity card generation and settings" },
  { key: "CERTIFICATES", label: "Certificates", description: "Certificate templates, issues and exports" },
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
    LEARNING: "MANAGE",
    TIMETABLE: "VIEW",
    CALENDAR: "VIEW",
    COMMUNICATION: "MANAGE",
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
    STUDENT_IDS: "MANAGE",
    ADMISSIONS: "MANAGE",
    FRONT_OFFICE: "MANAGE",
    SUPPORT: "VIEW",
  },
};

export const ROUTE_MODULES: Partial<Record<string, StaffPermissionModule>> = {
  dashboard: "DASHBOARD",
  students: "STUDENTS",
  enrollments: "STUDENT_RECORDS",
  "student-houses": "STUDENT_RECORDS",
  birthdays: "STUDENT_RECORDS",
  "id-cards": "STUDENT_IDS",
  certificates: "CERTIFICATES",
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

type ApiAccessRule = {
  prefix: string;
  read: readonly StaffPermissionModule[];
  write?: readonly StaffPermissionModule[];
  writeLevel?: "VIEW" | "MANAGE";
};

const ACADEMIC_REFERENCE_CONSUMERS = [
  "ACADEMICS", "ADMISSIONS", "ATTENDANCE", "LEARNING", "FEES",
  "TIMETABLE", "REPORTS", "STUDENTS", "STUDENT_RECORDS",
] as const satisfies readonly StaffPermissionModule[];

/** Shared reference data can be consumed without granting write access. */
export const API_ACCESS_RULES: readonly ApiAccessRule[] = [
  { prefix: "/api/v1/attendance", read: ["ATTENDANCE"], write: ["ATTENDANCE"] },
  { prefix: "/api/v1/fees", read: ["FEES"], write: ["FEES"] },
  { prefix: "/api/v1/fee-", read: ["FEES"], write: ["FEES"] },
  { prefix: "/api/v1/student-fees", read: ["FEES"], write: ["FEES"] },
  { prefix: "/api/v1/student-fee-", read: ["FEES"], write: ["FEES"] },
  { prefix: "/api/v1/direct-upi", read: ["FEES"], write: ["FEES"] },
  { prefix: "/api/v1/students/options", read: ACADEMIC_REFERENCE_CONSUMERS },
  { prefix: "/api/v1/students", read: ["STUDENTS"], write: ["STUDENTS"] },
  { prefix: "/api/v1/admissions", read: ["ADMISSIONS"], write: ["ADMISSIONS"] },
  { prefix: "/api/v1/student-enrollments", read: ["STUDENT_RECORDS"], write: ["STUDENT_RECORDS"] },
  { prefix: "/api/v1/houses", read: ["STUDENT_RECORDS"], write: ["STUDENT_RECORDS"] },
  { prefix: "/api/v1/birthdays", read: ["STUDENT_RECORDS"], write: ["STUDENT_RECORDS"] },
  { prefix: "/api/v1/id-card", read: ["STUDENT_IDS"], write: ["STUDENT_IDS"] },
  { prefix: "/api/v1/id-card-", read: ["STUDENT_IDS"], write: ["STUDENT_IDS"] },
  { prefix: "/api/v1/certificate", read: ["CERTIFICATES"], write: ["CERTIFICATES"] },
  { prefix: "/api/v1/certificate-", read: ["CERTIFICATES"], write: ["CERTIFICATES"] },
  { prefix: "/api/v1/teachers/options", read: ["ACADEMICS", "ATTENDANCE", "LEARNING", "TIMETABLE", "STAFF"] },
  { prefix: "/api/v1/teachers", read: ["ACADEMICS", "ATTENDANCE", "STAFF"], write: ["ACADEMICS"] },
  { prefix: "/api/v1/teacher-allocations", read: ["ACADEMICS", "ATTENDANCE", "LEARNING", "TIMETABLE"], write: ["ACADEMICS"] },
  { prefix: "/api/v1/class-teachers", read: ["ACADEMICS", "ATTENDANCE", "TIMETABLE"], write: ["ACADEMICS"] },
  { prefix: "/api/v1/class-subjects", read: ["ACADEMICS", "ATTENDANCE", "LEARNING", "TIMETABLE"], write: ["ACADEMICS"] },
  { prefix: "/api/v1/classes", read: ACADEMIC_REFERENCE_CONSUMERS, write: ["ACADEMICS"] },
  { prefix: "/api/v1/sections", read: ACADEMIC_REFERENCE_CONSUMERS, write: ["ACADEMICS"] },
  { prefix: "/api/v1/subjects", read: ["ACADEMICS", "ATTENDANCE", "LEARNING", "TIMETABLE", "REPORTS"], write: ["ACADEMICS"] },
  { prefix: "/api/v1/syllabi", read: ["ACADEMICS", "LEARNING"], write: ["ACADEMICS"] },
  { prefix: "/api/v1/academic-", read: ACADEMIC_REFERENCE_CONSUMERS, write: ["ACADEMICS"] },
  { prefix: "/api/v1/periods", read: ["TIMETABLE", "ATTENDANCE"], write: ["TIMETABLE"] },
  { prefix: "/api/v1/timetables", read: ["TIMETABLE", "ATTENDANCE"], write: ["TIMETABLE"] },
  { prefix: "/api/v1/homework", read: ["LEARNING"], write: ["LEARNING"] },
  { prefix: "/api/v1/exam-", read: ["LEARNING"], write: ["LEARNING"] },
  { prefix: "/api/v1/exams", read: ["LEARNING"], write: ["LEARNING"] },
  { prefix: "/api/v1/exam", read: ["LEARNING"], write: ["LEARNING"] },
  { prefix: "/api/v1/library", read: ["LIBRARY"], write: ["LIBRARY"] },
  { prefix: "/api/v1/transport", read: ["TRANSPORT"], write: ["TRANSPORT"] },
  { prefix: "/api/v1/notifications", read: ["COMMUNICATION"], write: ["COMMUNICATION"] },
  { prefix: "/api/v1/support/tickets", read: ["SUPPORT"], write: ["SUPPORT"] },
  { prefix: "/api/v1/operations", read: ["STAFF", "FRONT_OFFICE", "INVENTORY", "REPORTS"], write: ["STAFF", "FRONT_OFFICE", "INVENTORY"] },
  { prefix: "/api/v1/dashboard", read: ["DASHBOARD"] },
  { prefix: "/api/v1/payment-settings/direct-upi", read: ["FEES"], write: ["FEES"] },
  { prefix: "/api/v1/online-payments/cashfree/staff", read: ["FEES"], write: ["FEES"] },
  { prefix: "/api/v1/mobile/admin/dashboard", read: ["DASHBOARD"] },
  { prefix: "/api/v1/mobile/admin/announcements", read: ["COMMUNICATION"], write: ["COMMUNICATION"] },
  { prefix: "/api/v1/mobile/admin/content-options", read: ["LEARNING", "ACADEMICS"] },
  { prefix: "/api/v1/mobile/admin/homework", read: ["LEARNING"], write: ["LEARNING"] },
  { prefix: "/api/v1/mobile/admin/leave", read: ["CALENDAR"], write: ["CALENDAR"] },
  { prefix: "/api/v1/mobile/admin/notifications", read: ["COMMUNICATION"], write: ["COMMUNICATION"] },
  { prefix: "/api/v1/mobile/admin/reports", read: ["REPORTS"] },
  { prefix: "/api/v1/mobile/admin/sections", read: ACADEMIC_REFERENCE_CONSUMERS },
  { prefix: "/api/v1/mobile/admin/students", read: ["STUDENTS"], write: ["STUDENTS"] },
  { prefix: "/api/v1/report-exports", read: ["REPORTS"], write: ["REPORTS"], writeLevel: "VIEW" },
  { prefix: "/api/v1/reports", read: ["REPORTS"], write: ["REPORTS"], writeLevel: "VIEW" },
  { prefix: "/api/v1/report", read: ["REPORTS"], write: ["REPORTS"], writeLevel: "VIEW" },
] as const;

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

function matchesApiPrefix(pathname: string, prefix: string) {
  return prefix.endsWith("-")
    ? pathname.startsWith(prefix)
    : pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function permissionPolicyForRequest(
  pathname: string | null,
  schoolSlug: string,
  method: string | null,
) {
  const required = requiredAccessLevel(method);
  if (!pathname) return null;
  if (pathname.startsWith(`/${schoolSlug}/`)) {
    const route = resolveConfiguredRoute(pathname.slice(schoolSlug.length + 2));
    const permissionModule = moduleForRoute(route);
    return permissionModule ? { modules: [permissionModule], required, route } : null;
  }

  const rule = API_ACCESS_RULES.find(({ prefix }) => matchesApiPrefix(pathname, prefix));
  if (!rule) return null;
  const readOnly = !method || method === "GET" || method === "HEAD";
  return {
    modules: [...(readOnly ? rule.read : rule.write ?? rule.read)],
    required: readOnly ? "VIEW" as const : rule.writeLevel ?? "MANAGE" as const,
    route: null,
  };
}

export function permissionModulesForRequestPath(
  pathname: string | null,
  schoolSlug: string,
  method: string | null = "GET",
) {
  return permissionPolicyForRequest(pathname, schoolSlug, method)?.modules ?? [];
}

export function requiredAccessLevel(
  method: string | null,
): Exclude<StaffAccessLevel, "NONE"> {
  return !method || method === "GET" || method === "HEAD" ? "VIEW" : "MANAGE";
}

export function routesForModule(module: StaffPermissionModule) {
  return Object.entries(ROUTE_MODULES)
    .filter(([, candidate]) => candidate === module)
    .map(([route]) => route);
}

export function isModuleEnabledForSchool(
  school: RouteAccessConfig,
  module: StaffPermissionModule,
) {
  if (!school.routeAccessRestricted) return true;
  return routesForModule(module).some((route) => isRouteAllowed(school, route));
}

export type ApiAccessClassification =
  | "DELEGATED"
  | "SELF_SERVICE"
  | "ROLE_ONLY"
  | "PUBLIC"
  | "UNCLASSIFIED";

const SELF_SERVICE_API_PREFIXES = [
  "/api/v1/account-switch",
  "/api/v1/mobile/context",
  "/api/v1/mobile/family",
  "/api/v1/mobile/push/devices",
  "/api/v1/mobile/teacher",
  "/api/v1/notification-preferences",
  "/api/v1/online-payments/cashfree/orders",
  "/api/v1/pwa",
  "/api/v1/settings/profile-image",
  "/api/v1/web-push/devices",
] as const;

const ROLE_ONLY_API_PREFIXES = [
  "/api/v1/android-builds",
  "/api/v1/onboarding",
  "/api/v1/schools",
  "/api/v1/settings/managed-profile-image",
  "/api/v1/settings/profile-image-requests",
  "/api/v1/staff-accounts",
  "/api/v1/support/admin-accounts",
  "/api/v1/support/analytics",
  "/api/v1/support/devices",
  "/api/v1/support/staff",
  "/api/v1/support/students",
  "/api/v1/system",
] as const;

export function classifyApiRequestPath(pathname: string): ApiAccessClassification {
  if (pathname.startsWith("/api/v1/public/")) return "PUBLIC";
  if (API_ACCESS_RULES.some(({ prefix }) => matchesApiPrefix(pathname, prefix))) {
    return "DELEGATED";
  }
  if (SELF_SERVICE_API_PREFIXES.some((prefix) => matchesApiPrefix(pathname, prefix))) {
    return "SELF_SERVICE";
  }
  if (ROLE_ONLY_API_PREFIXES.some((prefix) => matchesApiPrefix(pathname, prefix))) {
    return "ROLE_ONLY";
  }
  return "UNCLASSIFIED";
}
