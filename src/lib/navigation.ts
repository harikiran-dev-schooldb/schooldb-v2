import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck,
  IndianRupee,
  BookOpen,
  Settings,
  PanelsTopLeft,
} from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    href: "dashboard",
    icon: LayoutDashboard,
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
  href: "/sections",
  icon: PanelsTopLeft,
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