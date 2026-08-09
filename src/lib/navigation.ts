import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck,
  IndianRupee,
  BookOpen,
  Settings,
  PanelsTopLeft,
  ClipboardPenLine,
} from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    href: "dashboard",
    icon: LayoutDashboard,
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
    ],
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
      {
        title: "Teacher Allocations",
        href: "teacher-allocations",
      },
    ],
  },

  {
    title: "Attendance",
    href: "attendance",
    icon: CalendarCheck,
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
    title: "Fees",
    href: "fees",
    icon: IndianRupee,
  },

  {
    title: "Settings",
    href: "settings",
    icon: Settings,
  },
];