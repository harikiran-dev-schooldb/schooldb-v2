import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck,
  IndianRupee,
  BookOpen,
  Settings,
  Upload,
  SlidersHorizontal,
} from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    href: "dashboard",
    icon: LayoutDashboard,
  },

  {
    title: "Users",
    icon: Users,
    children: [
      {
        title: "Students",
        href: "students",
      },
      {
        title: "Teachers",
        href: "teachers",
      },
    ],
  },
  {
    title: "Academic",
    icon: GraduationCap,
    children: [
      {
        title: "Academic Year",
        href: "academic-year",
      },
      {
        title: "Classes",
        href: "classes",
      },
      {
        title: "Sections",
        href: "sections",
      },
      {
        title: "Subjects",
        href: "subjects",
      },
      {
        title: "Enrollments",
        href: "enrollments",
      },
      {
        title: "Teacher Allocations",
        href: "teacher-allocations",
      },
    ],
  },
  {
    title: "Attendance",
    icon: CalendarCheck,
    children: [
      {
        title: "Dashboard",
        href: "attendance/dashboard",
      },
      {
        title: "Attendance",
        href: "attendance",
      },
      {
        title: "History",
        href: "attendance/history",
      },
      {
        title: "Class Report",
        href: "attendance/reports/class",
      },
      {
        title: "Student Report",
        href: "attendance/reports/student",
      },
      {
        title: "Low Attendance Report",
        href: "attendance/reports/low",
      },
    ],
  },

  {
    title: "Fees",
    icon: IndianRupee,
    children: [
      {
        title: "Fee Dashboard",
        href: "fees/dashboard",
      },
      {
        title: "Collect",
        href: "fees/collection",
      },
      {
        title: "Payments",
        href: "fees/payments",
      },
      {
        title: "Fee Due",
        href: "fees/outstanding",
      },
      {
        title: "Reciepts",
        href: "fees/receipts",
      },
      {
        title: "Fee Plans",
        href: "fees/plans",
      },
      {
        title: "Fee Categories",
        href: "fees/categories",
      },
    ],
  },

  {
    title: "Timetable",
    icon: CalendarCheck,
    children: [
      {
        title: "Periods",
        href: "periods",
      },
      {
        title: "Timetable",
        href: "timetable",
      },
      {
        title: "Daily Timetable",
        href: "timetable/daily",
      },
      {
        title: "Class Timetable",
        href: "timetable/class",
      },
      {
        title: "Teacher Timetable",
        href: "timetable/teacher",
      },
    ],
  },

  {
    title: "Academic Work",
    icon: BookOpen,
    children: [
      {
        title: "Homework",
        href: "homework",
      },
      {
        title: "Exams",
        href: "exams",
      },
    ],
  },

  {
    title: "Bulk Operations",
    href: "bulk-operations",
    icon: Upload,
  },

  {
  title: "Setup",
  href: "setup",
  icon: SlidersHorizontal,
},

  {
    title: "Settings",
    href: "settings",
    icon: Settings,
  },
];
