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
    title: "Academic Year",
    href: "academic-year",
    icon: GraduationCap,
  },
  {
    title: "Students",
    href: "students",
    icon: GraduationCap,
  },
  {
    title: "Classes",
    href: "classes",
    icon: GraduationCap,
  },
  {
    title: "Sections",
    href: "sections",
    icon: PanelsTopLeft,
  },
  {
    title: "Enrollments",
    href: "enrollments",
    icon: ClipboardPenLine,
  },
  {
    title: "Subjects",
    href: "subjects",
    icon: BookOpen,
  },
  {
    title: "Teachers",
    href: "teachers",
    icon: Users,
  },
  {
    title: "Attendance",
    href: "attendance",
    icon: CalendarCheck,
  },
  {
    title: "Fees",
    href: "fees",
    icon: IndianRupee,
  },
  {
    title: "Exams",
    href: "exams",
    icon: BookOpen,
  },
  {
    title: "Settings",
    href: "settings",
    icon: Settings,
  },
];
