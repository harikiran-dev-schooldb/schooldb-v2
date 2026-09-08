import { CreditCard, Printer } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { IdCardFilters } from "@/features/students/components/id-cards/IdCardFilters";
import { StudentIdCard, type StudentIdCardData } from "@/features/students/components/id-cards/StudentIdCard";
import { PrintDocumentButton } from "@/features/students/components/profile/PrintDocumentButton";
import { DEFAULT_ID_CARD_SETTING } from "@/features/students/services/id-card-setting.service";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ academicYearId?: string; classId?: string; sectionId?: string; studentId?: string }>;
};

export default async function IdCardsPage({ params, searchParams }: Props) {
  const [{ schoolSlug }, filters] = await Promise.all([params, searchParams]);
  const tenant = await requireTenant(schoolSlug);
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId: tenant.schoolId, active: true },
    orderBy: { startDate: "desc" },
    select: { id: true },
  });
  const academicYearId = filters.academicYearId || activeYear?.id || "";
  const shouldLoad = Boolean(academicYearId && (filters.studentId || filters.classId));

  const [school, enrollments] = await Promise.all([
    prisma.school.findUniqueOrThrow({
      where: { id: tenant.schoolId },
      select: {
        name: true,
        logo: true,
        idCardSetting: { select: { orientation: true, widthMm: true, heightMm: true, showBack: true, backImageUrl: true, backContent: true } },
      },
    }),
    shouldLoad
      ? prisma.studentEnrollment.findMany({
          where: {
            schoolId: tenant.schoolId,
            academicYearId,
            active: true,
            ...(filters.studentId ? { studentId: filters.studentId } : { classId: filters.classId, ...(filters.sectionId ? { sectionId: filters.sectionId } : {}) }),
          },
          orderBy: [{ class: { displayOrder: "asc" } }, { section: { displayOrder: "asc" } }, { rollNo: "asc" }, { student: { fullName: "asc" } }],
          take: 200,
          select: {
            rollNo: true,
            academicYear: { select: { name: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
            student: {
              select: {
                admissionNo: true,
                fullName: true,
                imageUrl: true,
                fatherName: true,
                motherName: true,
                guardianName: true,
                guardianPhone: true,
                fatherPhone: true,
                motherPhone: true,
                alternatePhone: true,
                phone: true,
                address: true,
                bloodGroup: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const cards: StudentIdCardData[] = enrollments.map((enrollment) => ({
    ...enrollment.student,
    enrollment: {
      academicYear: enrollment.academicYear.name,
      className: enrollment.class.name,
      sectionName: enrollment.section.name,
      rollNo: enrollment.rollNo,
    },
  }));
  const setting = school.idCardSetting
    ? {
        orientation: school.idCardSetting.orientation,
        widthMm: Number(school.idCardSetting.widthMm),
        heightMm: Number(school.idCardSetting.heightMm),
        showBack: school.idCardSetting.showBack,
        backImageUrl: school.idCardSetting.backImageUrl,
        backContent: school.idCardSetting.backContent,
      }
    : DEFAULT_ID_CARD_SETTING;

  return (
    <div className="space-y-7 pb-12">
      <PageHeader
        eyebrow="Student Services"
        title="Student ID Cards"
        description="Design and generate portrait or landscape identity cards for one student or an entire class."
        action={cards.length ? <PrintDocumentButton /> : undefined}
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-7 text-white shadow-2xl shadow-indigo-950/15 print:hidden md:px-8">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><CreditCard className="size-6 text-cyan-300" /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Identity Center</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Designed for your school</h2><p className="mt-1 text-sm text-indigo-100/75">Choose portrait or landscape, set the exact millimetre size, then print individually or class-wise.</p></div>
        </div>
      </section>

      <IdCardFilters
        initialAcademicYearId={academicYearId}
        initialClassId={filters.classId}
        initialSectionId={filters.sectionId}
        initialStudentId={filters.studentId}
        initialSetting={setting}
      />

      {shouldLoad && !cards.length ? (
        <div className="premium-card rounded-3xl border-0 p-12 text-center print:hidden">
          <CreditCard className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 font-bold">No enrolled students found</p>
          <p className="mt-1 text-sm text-muted-foreground">Change the academic year, class, section or student selection.</p>
        </div>
      ) : null}

      {cards.length ? (
        <section className="id-card-print space-y-5 rounded-3xl bg-slate-100 p-5 print:rounded-none print:bg-white print:p-0">
          <div className="flex items-center justify-between print:hidden">
            <p className="text-sm font-semibold">{cards.length} card{cards.length === 1 ? "" : "s"} ready</p>
            <div className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              <Printer className="size-4" />
              {setting.showBack ? "Front and back included" : "Front only"}
            </div>
          </div>
          <div className="id-card-sheet space-y-5 print:space-y-[5mm]">
            {cards.map((student) => <StudentIdCard key={student.admissionNo} school={school} student={student} setting={setting} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
