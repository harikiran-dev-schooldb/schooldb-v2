import type { CSSProperties, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type StudentIdCardData = {
  admissionNo: string;
  fullName: string | null;
  imageUrl: string | null;
  fatherName: string | null;
  motherName: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  fatherPhone: string | null;
  motherPhone: string | null;
  alternatePhone: string | null;
  phone: string | null;
  address: string | null;
  bloodGroup: string | null;
  enrollment: {
    academicYear: string;
    className: string;
    sectionName: string;
    rollNo: number | null;
  } | null;
};

type IdCardSetting = {
  orientation: "PORTRAIT" | "LANDSCAPE";
  widthMm: number;
  heightMm: number;
  showBack: boolean;
  backImageUrl: string | null;
  backContent: string | null;
};

type Props = {
  school: { name: string; logo: string | null };
  student: StudentIdCardData;
  setting?: IdCardSetting;
};

const DEFAULT_SETTING: IdCardSetting = {
  orientation: "PORTRAIT",
  widthMm: 54,
  heightMm: 85.6,
  showBack: true,
  backImageUrl: null,
  backContent: null,
};

function SchoolMark({ school, compact = false }: { school: Props["school"]; compact?: boolean }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center bg-white bg-contain bg-center bg-no-repeat font-black text-indigo-700 shadow-sm ring-1 ring-black/5", compact ? "size-7 rounded-lg text-xs" : "size-9 rounded-xl text-sm")}
      style={school.logo ? { backgroundImage: `url(${JSON.stringify(school.logo)})` } : undefined}
      role={school.logo ? "img" : undefined}
      aria-label={school.logo ? `${school.name} logo` : undefined}
    >
      {!school.logo ? school.name.charAt(0) : null}
    </div>
  );
}

function StudentPhoto({ name, imageUrl, portrait }: { name: string; imageUrl: string | null; portrait: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border-[3px] border-white bg-indigo-50 bg-cover bg-center font-black text-indigo-600 shadow-[0_8px_24px_rgba(30,27,75,0.18)] ring-1 ring-indigo-100",
        portrait ? "h-[29mm] w-[23mm] rounded-[5mm] text-3xl" : "h-[23mm] w-[18.5mm] rounded-[3mm] text-2xl",
      )}
      style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl)})` } : undefined}
      role={imageUrl ? "img" : undefined}
      aria-label={imageUrl ? `${name} photo` : undefined}
    >
      {!imageUrl ? name.charAt(0) : null}
    </div>
  );
}

function Detail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[6px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[8px] font-extrabold text-slate-800">{children}</dd>
    </div>
  );
}

export function StudentIdCard({ school, student, setting = DEFAULT_SETTING }: Props) {
  const portrait = setting.orientation === "PORTRAIT";
  const studentName = student.fullName || "Student";
  const parentName = student.fatherName || student.motherName || student.guardianName || "Not provided";
  const emergencyContact = student.guardianPhone || student.fatherPhone || student.motherPhone || student.alternatePhone || student.phone || "Not provided";
  const classLabel = student.enrollment ? `${student.enrollment.className} - ${student.enrollment.sectionName}` : "Not enrolled";
  const dimensionStyle = {
    "--id-card-width": `${setting.widthMm}mm`,
    "--id-card-height": `${setting.heightMm}mm`,
    "--id-card-ratio": `${setting.widthMm} / ${setting.heightMm}`,
  } as CSSProperties;

  return (
    <article className={cn("id-card-pair flex flex-wrap justify-center gap-5", portrait ? "is-portrait" : "is-landscape")} style={dimensionStyle}>
      <section className="id-card-side relative flex shrink-0 flex-col overflow-hidden border border-indigo-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] print:shadow-none">
        <div className="pointer-events-none absolute -right-10 top-8 size-32 rounded-full bg-violet-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 bottom-2 size-28 rounded-full bg-cyan-300/15 blur-2xl" />

        <header className={cn("relative bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white", portrait ? "px-3.5 pb-7 pt-3.5" : "px-3 py-2")}>
          <div className={cn("flex items-center gap-2.5", portrait && "justify-center")}>
            <SchoolMark school={school} compact={!portrait} />
            <div className={cn("min-w-0 flex-1", portrait && "max-w-[34mm]")}>
              <p className={cn("font-black uppercase leading-tight tracking-tight", portrait ? "text-center text-[9px]" : "truncate text-[11px]")}>{school.name}</p>
              <p className={cn("mt-0.5 font-bold uppercase tracking-[0.2em] text-cyan-300", portrait ? "text-center text-[5px]" : "text-[6px]")}>Student identity card</p>
              <p className={cn("mt-1 font-black uppercase tracking-[0.12em] text-white", portrait ? "text-center text-[6px]" : "text-[7px]")}>Academic year {student.enrollment?.academicYear ?? "-"}</p>
            </div>
          </div>
        </header>

        {portrait ? (
          <div className="relative -mt-6 flex min-h-0 flex-1 flex-col items-center px-3 pb-2 text-center">
            <StudentPhoto name={studentName} imageUrl={student.imageUrl} portrait />
            <h2 className="mt-2.5 max-w-full truncate text-[12px] font-black uppercase tracking-tight text-slate-950">{studentName}</h2>
            <p className="mt-1 rounded-full bg-indigo-50 px-3 py-1 text-[8px] font-extrabold text-indigo-700">{classLabel}</p>
            <dl className="mt-3 grid w-full grid-cols-2 gap-x-2 gap-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-left">
              <Detail label="Admission no.">{student.admissionNo}</Detail>
              <Detail label="Roll no.">{student.enrollment?.rollNo ?? "-"}</Detail>
              <Detail label="Parent / guardian">{parentName}</Detail>
              <Detail label="Mobile number">{emergencyContact}</Detail>
            </dl>
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 items-center gap-3 px-3 py-2">
            <StudentPhoto name={studentName} imageUrl={student.imageUrl} portrait={false} />
            <div className="min-w-0 flex-1">
              <p className="text-[6px] font-bold uppercase tracking-[0.18em] text-indigo-500">School identity</p>
              <h2 className="mt-1 truncate text-[13px] font-black uppercase tracking-tight text-slate-950">{studentName}</h2>
              <p className="mt-1 text-[9px] font-extrabold text-indigo-700">{classLabel}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-slate-50 p-2">
                <Detail label="Admission no.">{student.admissionNo}</Detail>
                <Detail label="Roll no.">{student.enrollment?.rollNo ?? "-"}</Detail>
                <Detail label="Parent / guardian">{parentName}</Detail>
                <Detail label="Mobile number">{emergencyContact}</Detail>
              </dl>
            </div>
          </div>
        )}
        <div className="relative h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500" />
      </section>

      {setting.showBack ? (
        <section className="id-card-side relative flex shrink-0 flex-col overflow-hidden border border-indigo-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] print:shadow-none">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500" />
          <header className={cn("flex items-center gap-2.5 border-b border-indigo-100 bg-indigo-50/70", portrait ? "px-3.5 pb-3 pt-4" : "px-3 pb-2 pt-3")}>
            <ShieldCheck className="size-4 shrink-0 text-indigo-600" />
            <div className="min-w-0"><p className="truncate text-[9px] font-black uppercase text-slate-900">{school.name}</p><p className="text-[5px] font-bold uppercase tracking-[0.18em] text-indigo-500">School information</p></div>
          </header>

          <div className={cn("flex min-h-0 flex-1 flex-col items-center justify-center text-center", portrait ? "gap-4 px-4 py-5" : "gap-2 px-6 py-2")}>
            <SchoolBackImage school={school} imageUrl={setting.backImageUrl} portrait={portrait} />
            <div>
              <p className={cn("font-black uppercase tracking-tight text-slate-950", portrait ? "text-[11px]" : "text-[12px]")}>{school.name}</p>
              {setting.backContent ? <p className={cn("mt-2 whitespace-pre-line font-semibold leading-relaxed text-slate-600", portrait ? "text-[7px]" : "max-w-[65mm] text-[7px]")}>{setting.backContent}</p> : <p className="mt-2 text-[7px] font-semibold leading-relaxed text-slate-500">If found, please return this card to the school office.</p>}
            </div>
          </div>

          <footer className={cn("border-t border-slate-200 text-center", portrait ? "px-3.5 py-4" : "px-4 py-1.5")}>
            <div className={cn("mx-auto h-px w-20 bg-slate-400", portrait ? "mb-1.5" : "mb-1")} />
            <p className="text-[6px] font-bold text-slate-700">Authorised signature</p>
            {portrait ? <p className="mt-2 text-[5px] leading-3 text-slate-400">This card is the property of {school.name}.</p> : null}
          </footer>
        </section>
      ) : null}
    </article>
  );
}

function SchoolBackImage({ school, imageUrl, portrait }: { school: Props["school"]; imageUrl: string | null; portrait: boolean }) {
  const source = imageUrl || school.logo;
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center bg-contain bg-center bg-no-repeat font-black text-indigo-700", portrait ? "size-[24mm] text-4xl" : "size-[14mm] text-3xl")}
      style={source ? { backgroundImage: `url(${JSON.stringify(source)})` } : undefined}
      role={source ? "img" : undefined}
      aria-label={source ? `${school.name} emblem` : undefined}
    >
      {!source ? school.name.charAt(0) : null}
    </div>
  );
}

export type { IdCardSetting, StudentIdCardData };
