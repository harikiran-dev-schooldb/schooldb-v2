import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserSquare2,
  CalendarCheck,
  IndianRupee,
  BookOpen,
  Settings,
} from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Students",
    url: "/students",
    icon: GraduationCap,
  },
  {
    title: "Teachers",
    url: "/teachers",
    icon: Users,
  },
  {
    title: "Parents",
    url: "/parents",
    icon: UserSquare2,
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: CalendarCheck,
  },
  {
    title: "Fees",
    url: "/fees",
    icon: IndianRupee,
  },
  {
    title: "Exams",
    url: "/exams",
    icon: BookOpen,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];