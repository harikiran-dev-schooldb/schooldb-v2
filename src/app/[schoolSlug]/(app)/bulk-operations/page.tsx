import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  Layers3,
  Users,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const operations = [
  {
    title: "Students",
    description: "Add student records in bulk with validation and duplicate checks.",
    href: "bulk-operations/students",
    icon: GraduationCap,
    status: "Ready",
  },
  {
    title: "Teachers",
    description: "Import teacher records with employee ID validation and duplicate checks.",
    href: "bulk-operations/teachers",
    icon: UserRound,
    status: "Ready",
  },
  {
    title: "Classes & Sections",
    description: "Create classes and their sections together from one validated CSV.",
    href: "bulk-operations/classes",
    icon: Users,
    status: "Ready",
  },
  {
    title: "Subjects",
    description: "Import subjects and academic subject mappings.",
    href: "../subjects",
    icon: Layers3,
    status: "Next",
  },
  {
    title: "Exams",
    description: "Prepare exam structures and schedules in bulk.",
    href: "../exams",
    icon: ClipboardList,
    status: "Planned",
  },
  {
    title: "Marks",
    description: "Upload marks for a class, subject, and examination.",
    href: "../exams",
    icon: BookOpenCheck,
    status: "Planned",
  },
  {
    title: "Fees",
    description: "Bulk fee assignments, installments, and payment imports.",
    href: "../fees/plans",
    icon: IndianRupee,
    status: "Next",
  },
  {
    title: "Timetable",
    description: "Import class and teacher timetable assignments.",
    href: "../timetable",
    icon: CalendarDays,
    status: "Next",
  },
];
}
