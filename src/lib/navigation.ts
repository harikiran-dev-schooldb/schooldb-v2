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

export const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "dashboard",
    icon: LayoutDashboard,
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
    children: [
      { title: "Students", href: "students" },
      {
        title: "Online Admissions",
        href: "admissions",
        roles: [...ADMIN_ROLES, "RECEPTIONIST"],
      },
      { title: "Enrollments", href: "enrollments" },
      { title: "Student ID Cards", href: "id-cards" },
      {
        title: "Certificate Register",
        href: "certificates",
        roles: ADMIN_ROLES,
      },
      { title: "Teachers", href: "teachers" },
      { title: "User Accounts", href: "users", roles: ADMIN_ROLES },
    ],
  },
  {
    title: "Attendance",
    icon: CalendarCheck,
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
    children: [
      { title: "Homework", href: "homework" },
      { title: "Exams & Results", href: "exams" },
      { title: "Toppers", href: "toppers" },
    ],
  },
  {
    title: "Fees",
    icon: IndianRupee,
    children: [
      { title: "Fee Overview", href: "fees/dashboard" },
      { title: "Collect Fees", href: "fees/collection" },
      { title: "Outstanding Fees", href: "fees/outstanding" },
      { title: "Payment History", href: "fees/payments" },
      { title: "Receipts", href: "fees/receipts" },
      { title: "Fee Plans", href: "fees/plans" },
      { title: "Fee Categories", href: "fees/categories" },
    ],
  },
  {
    title: "Timetable",
    icon: CalendarRange,
    children: [
      { title: "Build Timetable", href: "timetable", exact: true },
      { title: "Daily View", href: "timetable/daily" },
      { title: "Class View", href: "timetable/class" },
      { title: "Teacher View", href: "timetable/teacher" },
      { title: "School Periods", href: "periods" },
    ],
  },
  {
    title: "Academic Setup",
    icon: GraduationCap,
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
    roles: ADMIN_ROLES,
    children: [
      { title: "Notifications", href: "notifications" },
      { title: "WhatsApp Messages", href: "whatsapp" },
    ],
  },
  {
    title: "Administration",
    icon: Settings2,
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
