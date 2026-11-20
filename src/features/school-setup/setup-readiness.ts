type SetupOption = { id: string; name: string };
type SetupAllocation = { id: string; sectionId: string; subjectId: string; timetables: { id: string }[] };

type SetupClass = SetupOption & {
  branch: { name: string; syllabus: { name: string } };
  sections: SetupOption[];
  classSubjects: { subject: SetupOption }[];
  allocations: SetupAllocation[];
};

export function buildSetupReadiness(classes: SetupClass[]) {
  const rows = classes.map((schoolClass) => {
    const subjects = schoolClass.classSubjects.map(({ subject }) => subject);
    const allocations = new Map<string, Map<string, SetupAllocation>>();

    for (const allocation of schoolClass.allocations) {
      const sectionAllocations = allocations.get(allocation.sectionId) ?? new Map<string, SetupAllocation>();
      allocations.set(allocation.sectionId, sectionAllocations);
      const existing = sectionAllocations.get(allocation.subjectId);
      if (!existing || allocation.timetables.length > 0) {
        sectionAllocations.set(allocation.subjectId, allocation);
      }
    }

    const sections = schoolClass.sections.map((section) => {
      const sectionAllocations = allocations.get(section.id);
      const missingTeachers: SetupOption[] = [];
      const missingSlots: (SetupOption & { allocationId: string })[] = [];

      for (const subject of subjects) {
        const allocation = sectionAllocations?.get(subject.id);
        if (!allocation) {
          missingTeachers.push(subject);
        } else if (allocation.timetables.length === 0) {
          missingSlots.push({ ...subject, allocationId: allocation.id });
        }
      }

      return { ...section, missingTeachers, missingSlots };
    });

    return {
      id: schoolClass.id,
      name: schoolClass.name,
      branch: schoolClass.branch,
      subjectCount: subjects.length,
      sections,
    };
  });

  const sections = rows.flatMap((row) => row.sections);
  const mappedSections = rows.filter((row) => row.subjectCount > 0).flatMap((row) => row.sections);

  return {
    rows,
    classesWithSections: rows.filter((row) => row.sections.length > 0).length,
    classesWithSubjects: rows.filter((row) => row.subjectCount > 0).length,
    sectionCount: sections.length,
    sectionsWithTeachers: mappedSections.filter((section) => section.missingTeachers.length === 0).length,
    sectionsWithTimetables: mappedSections.filter(
      (section) => section.missingTeachers.length === 0 && section.missingSlots.length === 0,
    ).length,
  };
}

export type SetupSearchParams = Promise<Record<string, string | string[] | undefined>>;

export function readSetupParam(params: Awaited<SetupSearchParams>, key: string) {
  const value = params[key];
  return typeof value === "string" && value.length <= 100 ? value : undefined;
}
