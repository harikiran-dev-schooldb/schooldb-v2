import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarRange,
  ChartNoAxesCombined,
  CircleHelp,
  FileSpreadsheet,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  Megaphone,
  Settings2,
  School,
  UserRound,
  UsersRound,
} from "lucide-react";

export type NavigationChild = {
  title: string;
  href: string;
  exact?: boolean;
  roles?: string[];
};

export type NavigationItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  roles?: string[];
  children?: NavigationChild[];
};

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
const STAFF_ROLES = [...ADMIN_ROLES, "TEACHER", "ACCOUNTANT", "RECEPTIONIST"];
const ATTENDANCE_ROLES = [...ADMIN_ROLES, "TEACHER"];
const FEE_ROLES = [...ADMIN_ROLES, "ACCOUNTANT"];
const FEE_VIEW_ROLES = [...FEE_ROLES, "TEACHER"];
const TEACHING_ROLES = [...ADMIN_ROLES, "TEACHER"];
const STUDENT_DIRECTORY_ROLES = [
  ...ADMIN_ROLES,
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
];

export const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "dashboard",
    icon: LayoutDashboard,
    roles: [...ADMIN_ROLES, "ACCOUNTANT", "RECEPTIONIST"],
  },
  {
    title: "My Dashboard",
    href: "teacher/dashboard",
    icon: LayoutDashboard,
    roles: ["TEACHER"],
  },
  {
    title: "My Profile",
    href: "teacher/profile",
    icon: UserRound,
    roles: ["TEACHER"],
  },
  {
    title: "Schools",
    href: "schools",
    icon: School,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "People",
    icon: UsersRound,
    roles: STUDENT_DIRECTORY_ROLES,
    children: [
      { title: "Students", href: "students", roles: STUDENT_DIRECTORY_ROLES },
      { title: "Teachers", href: "teachers", roles: ADMIN_ROLES },
      { title: "Enrollments", href: "enrollments", roles: ADMIN_ROLES },
      {
        title: "Online Admissions",
        href: "admissions",
        roles: [...ADMIN_ROLES, "RECEPTIONIST"],
      },
      { title: "Student Houses", href: "student-houses", roles: ADMIN_ROLES },
      { title: "Birthdays", href: "birthdays", roles: ADMIN_ROLES },
      {
        title: "Student ID Cards",
        href: "id-cards",
        roles: [...ADMIN_ROLES, "RECEPTIONIST"],
      },
      {
        title: "Certificate Register",
        href: "certificates",
        roles: ADMIN_ROLES,
      },
      { title: "User Accounts", href: "users", roles: ADMIN_ROLES },
    ],
  },
  {
    title: "Attendance",
    icon: CalendarCheck,
    roles: ATTENDANCE_ROLES,
    children: [
      { title: "Mark Attendance", href: "attendance", exact: true },
      {
        title: "Attendance Overview",
        href: "attendance/dashboard",
        roles: ADMIN_ROLES,
      },
      {
        title: "Session History",
        href: "attendance/history",
        roles: ADMIN_ROLES,
      },
      {
        title: "Class Report",
        href: "attendance/reports/class",
        roles: ATTENDANCE_ROLES,
      },
      {
        title: "Student Report",
        href: "attendance/reports/student",
        roles: ATTENDANCE_ROLES,
      },
      {
        title: "Low Attendance",
        href: "attendance/reports/low",
        roles: ADMIN_ROLES,
      },
      {
        title: "Attendance Ranking",
        href: "attendance/ranking",
        roles: ATTENDANCE_ROLES,
      },
    ],
  },
  {
    title: "Learning",
    icon: BookOpenCheck,
    roles: TEACHING_ROLES,
    children: [
      { title: "Homework", href: "homework" },
      { title: "Exams & Results", href: "exams" },
      { title: "Toppers", href: "toppers" },
    ],
  },
  {
    title: "Fees",
    icon: IndianRupee,
    roles: FEE_VIEW_ROLES,
    children: [
      { title: "Fee Overview", href: "fees/dashboard", roles: FEE_ROLES },
      { title: "Collect Fees", href: "fees/collection", roles: FEE_ROLES },
      {
        title: "Outstanding Fees",
        href: "fees/outstanding",
        roles: FEE_VIEW_ROLES,
      },
      { title: "Payment History", href: "fees/payments", roles: FEE_ROLES },
      {
        title: "UPI Verification",
        href: "fees/upi-verification",
        roles: FEE_ROLES,
      },
      { title: "Receipts", href: "fees/receipts", roles: FEE_ROLES },
      {
        title: "Expenses",
        href: "expenses",
        roles: [...ADMIN_ROLES, "ACCOUNTANT"],
      },
      { title: "Fee Plans", href: "fees/plans", roles: FEE_ROLES },
      { title: "Fee Categories", href: "fees/categories", roles: FEE_ROLES },
    ],
  },
  {
    title: "Timetable",
    icon: CalendarRange,
    roles: TEACHING_ROLES,
    children: [
      {
        title: "Build Timetable",
        href: "timetable",
        exact: true,
        roles: ADMIN_ROLES,
      },
      { title: "Daily View", href: "timetable/daily", roles: TEACHING_ROLES },
      { title: "Class View", href: "timetable/class", roles: TEACHING_ROLES },
      {
        title: "Teacher View",
        href: "timetable/teacher",
        roles: TEACHING_ROLES,
      },
      { title: "School Periods", href: "periods", roles: ADMIN_ROLES },
    ],
  },
  {
    title: "Academic Setup",
    icon: GraduationCap,
    roles: ADMIN_ROLES,
    children: [
      { title: "Academic Years", href: "academic-year" },
      { title: "Syllabi & Branches", href: "setup/academic-structure" },
      { title: "Classes", href: "classes" },
      { title: "Sections", href: "sections" },
      { title: "Subjects", href: "subjects" },
      { title: "Class Subjects", href: "setup/class-subjects" },
      { title: "Teacher Allocations", href: "teacher-allocations" },
      { title: "Class Teachers", href: "class-teachers" },
    ],
  },
  {
    title: "Reports",
    href: "reports",
    icon: FileSpreadsheet,
    roles: ADMIN_ROLES,
  },
  {
    title: "Analytics",
    href: "management-analytics",
    icon: ChartNoAxesCombined,
    roles: ADMIN_ROLES,
  },
  {
    title: "School Operations",
    icon: BriefcaseBusiness,
    children: [
      {
        title: "Staff Attendance & Payroll",
        href: "staff-operations",
        roles: [...ADMIN_ROLES, "ACCOUNTANT"],
      },
      {
        title: "Visitors & Gate Passes",
        href: "visitors",
        roles: [...ADMIN_ROLES, "RECEPTIONIST"],
      },
      {
        title: "Student Health",
        href: "student-health",
        roles: [...ADMIN_ROLES, "RECEPTIONIST"],
      },
      {
        title: "Inventory & Assets",
        href: "inventory",
        roles: [...ADMIN_ROLES, "ACCOUNTANT"],
      },
      {
        title: "Student Pickup",
        href: "student-pickup",
        roles: [...ADMIN_ROLES, "RECEPTIONIST"],
      },
      {
        title: "Maintenance Tickets",
        href: "maintenance",
        roles: [...ADMIN_ROLES, "RECEPTIONIST"],
      },
      { title: "Library", href: "library", roles: ADMIN_ROLES },
      { title: "Transport", href: "transport", roles: ADMIN_ROLES },
      { title: "School Calendar", href: "calendar", roles: ADMIN_ROLES },
      {
        title: "Leave Requests",
        href: "leave-requests",
        roles: [...ADMIN_ROLES, "TEACHER"],
      },
    ],
  },
  {
    title: "Communication",
    icon: Megaphone,
    roles: STAFF_ROLES,
    children: [
      { title: "Notifications", href: "notifications", roles: TEACHING_ROLES },
      { title: "Queries", href: "queries", roles: STAFF_ROLES },
      { title: "Parent Queries", href: "parent-queries", roles: ADMIN_ROLES },
      { title: "WhatsApp Messages", href: "whatsapp", roles: ADMIN_ROLES },
    ],
  },
  {
    title: "User Guide",
    href: "user-guide",
    icon: CircleHelp,
    roles: STAFF_ROLES,
  },
  {
    title: "Administration",
    icon: Settings2,
    roles: ADMIN_ROLES,
    children: [
      { title: "Bulk Operations", href: "bulk-operations" },
      {
        title: "Activity & Audit Logs",
        href: "audit-logs",
        roles: ADMIN_ROLES,
      },
      { title: "System Health", href: "system", roles: ADMIN_ROLES },
      { title: "School Setup", href: "setup", exact: true },
    ],
  },
];
