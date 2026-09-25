import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarRange,
  ChartNoAxesCombined,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  Megaphone,
  Settings2,
  School,
  Smartphone,
  UsersRound,
} from "lucide-react";

type NavigationChild = {
  title: string;
  href: string;
  exact?: boolean;
  roles?: string[];
};

type NavigationItem = {
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
    title: "Schools",
    href: "schools",
    icon: School,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Android App Builder",
    href: "schools/android-app",
    icon: Smartphone,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Reports & Analytics",
    href: "reports",
    icon: ChartNoAxesCombined,
    roles: ADMIN_ROLES,
  },
  {
    title: "People",
    icon: UsersRound,
    roles: STUDENT_DIRECTORY_ROLES,
    children: [
      { title: "Students", href: "students", roles: STUDENT_DIRECTORY_ROLES },
      {
        title: "Online Admissions",
        href: "admissions",
        roles: [...ADMIN_ROLES, "RECEPTIONIST"],
      },
      { title: "Enrollments", href: "enrollments", roles: ADMIN_ROLES },
      { title: "Student Houses", href: "student-houses", roles: ADMIN_ROLES },
      { title: "Birthdays", href: "birthdays", roles: ADMIN_ROLES },
      { title: "Student ID Cards", href: "id-cards", roles: [...ADMIN_ROLES, "RECEPTIONIST"] },
      {
        title: "Certificate Register",
        href: "certificates",
        roles: ADMIN_ROLES,
      },
      { title: "Teachers", href: "teachers", roles: ADMIN_ROLES },
      { title: "User Accounts", href: "users", roles: ADMIN_ROLES },
    ],
  },
  {
    title: "Attendance",
    icon: CalendarCheck,
    roles: ATTENDANCE_ROLES,
    children: [
      { title: "Mark Attendance", href: "attendance", exact: true },
      { title: "Attendance Overview", href: "attendance/dashboard" },
      { title: "Session History", href: "attendance/history" },
      { title: "Class Report", href: "attendance/reports/class" },
      { title: "Student Report", href: "attendance/reports/student" },
      { title: "Low Attendance", href: "attendance/reports/low" },
      { title: "Attendance Ranking", href: "attendance/ranking" },
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
    roles: FEE_ROLES,
    children: [
      { title: "Fee Overview", href: "fees/dashboard" },
      { title: "Collect Fees", href: "fees/collection" },
      { title: "Outstanding Fees", href: "fees/outstanding" },
      { title: "Payment History", href: "fees/payments" },
      { title: "Receipts", href: "fees/receipts" },
      {
        title: "Expenses",
        href: "expenses",
        roles: [...ADMIN_ROLES, "ACCOUNTANT"],
      },
      { title: "Fee Plans", href: "fees/plans" },
      { title: "Fee Categories", href: "fees/categories" },
    ],
  },
  {
    title: "Timetable",
    icon: CalendarRange,
    roles: TEACHING_ROLES,
    children: [
      { title: "Build Timetable", href: "timetable", exact: true, roles: ADMIN_ROLES },
      { title: "Daily View", href: "timetable/daily", roles: TEACHING_ROLES },
      { title: "Class View", href: "timetable/class", roles: TEACHING_ROLES },
      { title: "Teacher View", href: "timetable/teacher", roles: TEACHING_ROLES },
      { title: "School Periods", href: "periods", roles: ADMIN_ROLES },
    ],
  },
  {
    title: "Academic Setup",
    icon: GraduationCap,
    roles: ADMIN_ROLES,
    children: [
      { title: "Academic Years", href: "academic-year" },
      { title: "Classes", href: "classes" },
      { title: "Sections", href: "sections" },
      { title: "Subjects", href: "subjects" },
      { title: "Class Subjects", href: "setup/class-subjects" },
      { title: "Teacher Allocations", href: "teacher-allocations" },
    ],
  },
  {
    title: "School Operations",
    icon: BriefcaseBusiness,
    children: [
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
      { title: "Notifications", href: "notifications", roles: ADMIN_ROLES },
      { title: "Queries", href: "queries", roles: STAFF_ROLES },
      { title: "WhatsApp Messages", href: "whatsapp", roles: ADMIN_ROLES },
    ],
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
