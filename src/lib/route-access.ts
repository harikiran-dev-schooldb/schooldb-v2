export type RouteAccessConfig = {
  routeAccessRestricted: boolean;
  allowedRoutes: string[];
  defaultLandingRoute?: string | null;
  moduleAccessRestricted?: boolean;
};

export const ALWAYS_AVAILABLE_ROUTES = new Set([
  "schools",
  "schools/route-access",
]);

export const ALWAYS_MEMBER_ROUTES = new Set(["user-guide", "teacher/profile"]);

export const BULK_OPERATION_ROUTES = [
  { title: "Academic-year Rollover", href: "bulk-operations/academic-year-rollover" },
  { title: "Inventory & Assets", href: "bulk-operations/admin/inventory" },
  { title: "Expenses & Opening Entries", href: "bulk-operations/admin/expenses" },
  { title: "Calendar & Holidays", href: "bulk-operations/admin/calendar" },
  { title: "Parent & Guardian Links", href: "bulk-operations/admin/parent-links" },
  { title: "Salary Structures", href: "bulk-operations/admin/salary-structures" },
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
  "presentation",
  "teacher/dashboard",
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
  "exams/grading-policy",
  "toppers",
  "failures",
  "student-follow-ups",
  "strategic-workflows",
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

  if (config.allowedRoutes.includes(href)) return true;
  const parentRoute = resolveConfiguredRoute(href);
  return Boolean(parentRoute && parentRoute !== href && config.allowedRoutes.includes(parentRoute));
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

export const ADMISSIONS_ONLY_ROUTES=["admissions","academic-year","setup/academic-structure","classes","sections","users","settings","notification-inbox"] as const;
export function isAdmissionsOnlySchool(config:RouteAccessConfig){
 return config.routeAccessRestricted&&config.allowedRoutes.includes("admissions")&&config.allowedRoutes.every(r=>(ADMISSIONS_ONLY_ROUTES as readonly string[]).includes(r));
}
export function validLandingRoute(config:RouteAccessConfig,route:unknown){
 if(typeof route!=="string"||!route||route.length>100)return null;
 if(route!=="admissions/dashboard"&&!CONFIGURABLE_ROUTES.has(route))return null;
 return isRouteAllowed(config,route)?route:null;
}


/** Product modules are sets of routes, not replacements for member permissions. */
export const SCHOOL_MODULES = [
 {key:"ADMISSIONS",label:"Admissions",description:"Applications, enquiries, age rules, fee quotes and seat planning",routes:["admissions"]},
 {key:"SUPPORT",label:"Support & Parent Queries",description:"School Support tickets, parent queries and QR intake",routes:["queries","parent-queries"]},
 {key:"ACADEMIC_SETUP",label:"Academic Setup",description:"Years, syllabi, branches, classes and sections",routes:["academic-year","setup/academic-structure","classes","sections"]},
 {key:"USER_MANAGEMENT",label:"User Management",description:"Staff accounts and permissions",routes:["users"]},
 {key:"DASHBOARD",label:"ERP Dashboard",description:"School overview",routes:["dashboard","teacher/dashboard"]},
 {key:"STUDENTS",label:"Student Records",description:"Directory, enrollments, houses and identity cards",routes:["students","students/class-report","enrollments","student-houses","birthdays","id-cards","certificates"]},
 {key:"ACADEMIC_OPERATIONS",label:"Academic Operations",description:"Teachers, subjects, allocations and class teachers",routes:["teachers","subjects","setup/class-subjects","teacher-allocations","class-teachers"]},
 {key:"ATTENDANCE",label:"Attendance",description:"Attendance and reports",routes:["attendance","attendance/dashboard","attendance/history","attendance/reports/class","attendance/reports/student","attendance/reports/low","attendance/ranking"]},
 {key:"FEES",label:"Fee Management",description:"Fee plans, collections and accounts",routes:["fees/dashboard","fees/collection","fees/outstanding","fees/payments","fees/upi-verification","fees/receipts","fees/plans","fees/categories","expenses"]},
 {key:"LEARNING",label:"Learning & Exams",description:"Homework, exams and results",routes:["homework","exams","exams/grading-policy","toppers","failures","student-follow-ups"]},
 {key:"TIMETABLE",label:"Timetable",description:"Periods and timetable",routes:["timetable","timetable/daily","timetable/class","timetable/teacher","periods"]},
 {key:"TRANSPORT",label:"Transport",description:"Transport routes and assignments",routes:["transport"]},
 {key:"LIBRARY",label:"Library",description:"Library and lending",routes:["library"]},
 {key:"STAFF",label:"Staff & Payroll",description:"Staff operations",routes:["staff-operations"]},
 {key:"FRONT_OFFICE",label:"Front Office",description:"Visitors, health, pickup and maintenance",routes:["visitors","student-health","student-pickup","maintenance"]},
 {key:"INVENTORY",label:"Inventory",description:"Inventory and assets",routes:["inventory"]},
 {key:"CALENDAR",label:"Calendar & Leave",description:"Calendar and leave requests",routes:["calendar","leave-requests"]},
 {key:"COMMUNICATION",label:"Communication",description:"Announcements and WhatsApp",routes:["notifications","whatsapp"]},
 {key:"REPORTS",label:"Reports & Analytics",description:"ERP reports and management analytics",routes:["reports","management-analytics","presentation"]},
] as const;
export const ADMISSIONS_SUPPORT_DEMO_ROUTES = [...ADMISSIONS_ONLY_ROUTES,"queries","parent-queries"];
export function isAdmissionsSupportWorkspace(config:RouteAccessConfig){
 return config.routeAccessRestricted&&config.allowedRoutes.includes("admissions")&&config.allowedRoutes.every(r=>ADMISSIONS_SUPPORT_DEMO_ROUTES.includes(r));
}
export function usesStrictModuleAccess(config:RouteAccessConfig){
 return config.routeAccessRestricted&&(config.moduleAccessRestricted===true||isAdmissionsSupportWorkspace(config));
}
/** Add or remove a module without resetting the other selected routes. */
export function toggleSchoolModule(routes:string[],key:string,checked:boolean){
 const module=SCHOOL_MODULES.find(m=>m.key===key);
 if(!module)return routes;
 const group:readonly string[]=module.routes;
 return normalizeAllowedRoutes(checked?[...routes,...group]:routes.filter(r=>!group.includes(r)));
}
export function isAdmissionsPackageApiAllowed(config:RouteAccessConfig,pathname:string,role:string,method:string|null){
 if(!usesStrictModuleAccess(config)||!pathname.startsWith("/api/v1/"))return true;
 const matches=(prefix:string)=>pathname===prefix||pathname.startsWith(prefix+"/")||(prefix.endsWith("-")&&pathname.startsWith(prefix));
 const enabled=(...routes:string[])=>routes.some(r=>isRouteAllowed(config,r));
 const read=method==="GET"||method==="HEAD";
 if(role==="SUPER_ADMIN"&&matches("/api/v1/schools"))return true;
 if(matches("/api/v1/search"))return read&&enabled("admissions","students","teachers","fees/payments","queries");
 if(matches("/api/v1/admissions"))return enabled("admissions");
 if(matches("/api/v1/support/admin-accounts"))return role==="SUPER_ADMIN"&&enabled("users");
 if(matches("/api/v1/support"))return enabled("queries");
 if(matches("/api/v1/staff-accounts"))return enabled("users");
 if(["/api/v1/account-switch","/api/v1/mobile/context","/api/v1/notification-preferences","/api/v1/pwa","/api/v1/web-push/devices","/api/v1/mobile/push/devices","/api/v1/settings/profile-image"].some(matches))return true;
 // Only the exact inbox endpoint is shared; announcement publishing is a separate module.
 if(pathname==="/api/v1/notifications")return enabled("notification-inbox","notifications");
 const refs=[["/api/v1/academic-years","academic-year"],["/api/v1/academic-branches","setup/academic-structure"],["/api/v1/syllabi","setup/academic-structure"],["/api/v1/classes","classes"],["/api/v1/sections","sections"]];
 const reference=refs.find(([prefix])=>matches(prefix));
 if(reference)return enabled(reference[1])||(read&&enabled("admissions","queries","students","enrollments","attendance","exams","fees/plans","timetable","teachers","subjects","reports"));
 if(matches("/api/v1/students/options"))return read&&enabled("students","enrollments","attendance");
 const rules:[string,string[]][]=[
 ["/api/v1/students",["students"]],["/api/v1/student-enrollments",["enrollments"]],["/api/v1/houses",["student-houses"]],["/api/v1/birthdays",["birthdays"]],
 ["/api/v1/id-card",["id-cards"]],["/api/v1/id-card-",["id-cards"]],["/api/v1/certificate",["certificates"]],["/api/v1/certificate-",["certificates"]],
 ["/api/v1/teachers",["teachers"]],["/api/v1/teacher-allocations",["teacher-allocations"]],["/api/v1/class-teachers",["class-teachers"]],["/api/v1/class-subjects",["setup/class-subjects"]],["/api/v1/subjects",["subjects"]],
 ["/api/v1/attendance",["attendance"]],["/api/v1/fees",["fees/dashboard","fees/collection","fees/outstanding","fees/payments"]],["/api/v1/fee-",["fees/plans","fees/categories"]],["/api/v1/student-fees",["fees/collection"]],["/api/v1/student-fee-",["fees/collection"]],["/api/v1/direct-upi",["fees/upi-verification"]],["/api/v1/payment-settings/direct-upi",["fees/plans"]],["/api/v1/online-payments/cashfree/staff",["fees/collection"]],
 ["/api/v1/homework",["homework"]],["/api/v1/exams",["exams"]],["/api/v1/exam-",["exams"]],["/api/v1/student-follow-ups",["student-follow-ups"]],["/api/v1/periods",["periods"]],["/api/v1/timetables",["timetable"]],
 ["/api/v1/library",["library"]],["/api/v1/transport",["transport"]],["/api/v1/dashboard",["dashboard"]],["/api/v1/mobile/admin/dashboard",["dashboard"]],["/api/v1/mobile/admin/students",["students"]],["/api/v1/mobile/admin/homework",["homework"]],["/api/v1/mobile/admin/leave",["leave-requests"]],["/api/v1/mobile/admin/announcements",["notifications"]],["/api/v1/mobile/admin/notifications",["notifications"]],["/api/v1/mobile/admin/reports",["reports"]],["/api/v1/mobile/admin/content-options",["homework"]],["/api/v1/mobile/admin/sections",["sections"]],
 ["/api/v1/report-downloads",["reports"]],["/api/v1/report-exports",["reports"]],["/api/v1/reports",["reports"]],["/api/v1/report",["reports"]],["/api/v1/notifications",["notifications"]],["/api/v1/whatsapp",["whatsapp"]],["/api/v1/calendar",["calendar"]],["/api/v1/leave-requests",["leave-requests"]],
 ];
 const rule=rules.find(([prefix])=>matches(prefix));
 if(rule)return enabled(...rule[1]);
 // Shared operations and unmapped endpoints fail closed until explicitly classified.
 return false;
}
