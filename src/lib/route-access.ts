export type RouteAccessConfig = {
  routeAccessRestricted: boolean;
  allowedRoutes: string[];
};

export const ALWAYS_AVAILABLE_ROUTES = new Set([
  "schools",
  "schools/route-access",
]);

export const ALWAYS_MEMBER_ROUTES = new Set(["user-guide", "teacher/profile"]);

export const BULK_OPERATION_ROUTES = [
  { title: "Copy School Setup", href: "bulk-operations/copy-school-setup" },
  { title: "Students", href: "bulk-operations/students" },
  { title: "Student Login Access", href: "bulk-operations/student-logins" },
  { title: "Student Houses", href: "bulk-operations/houses" },
  {
    title: "Student House Allocation",
    href: "bulk-operations/house-allocations",
  },
  { title: "Student Promotion", href: "bulk-operations/student-promotion" },
  { title: "Teachers", href: "bulk-operations/teachers" },
  { title: "Teacher Allocation", href: "bulk-operations/teacher-allocations" },
  { title: "Class Teachers", href: "bulk-operations/class-teachers" },
  { title: "Classes & Sections", href: "bulk-operations/classes" },
  { title: "Subjects", href: "bulk-operations/subjects" },
  { title: "Class Subjects", href: "bulk-operations/class-subjects" },
  { title: "Attendance", href: "bulk-operations/attendance" },
  { title: "Exams", href: "bulk-operations/exams" },
  { title: "Exam Schedules", href: "bulk-operations/exam-schedules" },
  { title: "Marks", href: "bulk-operations/marks" },
  { title: "Fee Plans", href: "bulk-operations/fee-plans" },
  { title: "Fee Assignments", href: "bulk-operations/fee-assignments" },
  { title: "Fee Payments", href: "bulk-operations/fees" },
  { title: "School Periods", href: "bulk-operations/periods" },
  { title: "Timetable", href: "bulk-operations/timetable" },
  { title: "Library", href: "bulk-operations/library" },
  { title: "Transport", href: "bulk-operations/transport" },
] as const;

const navigationRoutes = [
  "dashboard",
  "teacher/dashboard",
  "schools/android-app",
  "reports",
  "management-analytics",
  "students",
  "students/class-report",
  "admissions",
  "enrollments",
  "student-houses",
  "birthdays",
  "id-cards",
  "certificates",
  "teachers",
  "users",
  "attendance",
  "attendance/dashboard",
  "attendance/history",
  "attendance/reports/class",
  "attendance/reports/student",
  "attendance/reports/low",
  "attendance/ranking",
  "homework",
  "exams",
  "toppers",
  "fees/dashboard",
  "fees/collection",
  "fees/outstanding",
  "fees/payments",
  "fees/upi-verification",
  "fees/receipts",
  "expenses",
  "fees/plans",
  "fees/categories",
  "timetable",
  "timetable/daily",
  "timetable/class",
  "timetable/teacher",
  "periods",
  "academic-year",
  "setup/academic-structure",
  "classes",
  "sections",
  "subjects",
  "setup/class-subjects",
  "teacher-allocations",
  "class-teachers",
  "staff-operations",
  "visitors",
  "student-health",
  "inventory",
  "student-pickup",
  "maintenance",
  "library",
  "transport",
  "calendar",
  "leave-requests",
  "notifications",
  "queries",
  "parent-queries",
  "whatsapp",
  "audit-logs",
  "system",
  "setup",
  "notification-inbox",
] as const;

export const CONFIGURABLE_ROUTES = new Set([
  ...navigationRoutes,
  ...BULK_OPERATION_ROUTES.map((route) => route.href),
  "settings",
]);

export function isRouteAllowed(config: RouteAccessConfig, href?: string) {
  if (!href || !config.routeAccessRestricted) return true;
  if (ALWAYS_AVAILABLE_ROUTES.has(href)) return true;
  if (ALWAYS_MEMBER_ROUTES.has(href)) return true;

  if (href === "bulk-operations") {
    return config.allowedRoutes.some((route) =>
      route.startsWith("bulk-operations/"),
    );
  }

  return config.allowedRoutes.includes(href);
}

const knownRoutes = [
  ...ALWAYS_AVAILABLE_ROUTES,
  ...ALWAYS_MEMBER_ROUTES,
  ...CONFIGURABLE_ROUTES,
  "bulk-operations",
].sort((left, right) => right.length - left.length);

export function resolveConfiguredRoute(relativePath: string) {
  const normalizedPath = relativePath.replace(/^\/+|\/+$/g, "");
  return knownRoutes.find(
    (candidate) =>
      normalizedPath === candidate ||
      normalizedPath.startsWith(`${candidate}/`),
  );
}

export function isSchoolPathAllowed(
  config: RouteAccessConfig,
  pathname: string,
  schoolSlug: string,
  role: string,
) {
  if (!config.routeAccessRestricted) return true;

  const prefix = `/${schoolSlug}/`;
  if (!pathname.startsWith(prefix)) return false;

  const relativePath = pathname.slice(prefix.length).replace(/\/+$/, "");
  const route = resolveConfiguredRoute(relativePath);

  if (!route) return false;
  if (ALWAYS_AVAILABLE_ROUTES.has(route)) return role === "SUPER_ADMIN";
  if (ALWAYS_MEMBER_ROUTES.has(route)) return true;
  return isRouteAllowed(config, route);
}

export function normalizeAllowedRoutes(routes: unknown) {
  if (!Array.isArray(routes)) return [];

  return [...new Set(routes)].filter(
    (route): route is string =>
      typeof route === "string" && CONFIGURABLE_ROUTES.has(route),
  );
}
