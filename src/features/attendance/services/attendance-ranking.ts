type AttendanceRankingInput = {
  fullName: string;
  total: number;
  present: number;
  late: number;
  attendancePercentage: number;
};

export function rankAttendanceStudents<T extends AttendanceRankingInput>(
  students: T[],
  limit: number,
) {
  const eligible = students
    .filter((student) => student.total > 0)
    .sort((a, b) =>
      b.attendancePercentage - a.attendancePercentage ||
      b.present + b.late - (a.present + a.late) ||
      a.fullName.localeCompare(b.fullName),
    );

  let previousPercentage: number | null = null;
  let currentRank = 0;

  const ranked = eligible.map((student, index) => {
    if (student.attendancePercentage !== previousPercentage) {
      currentRank = index + 1;
      previousPercentage = student.attendancePercentage;
    }

    return { ...student, rank: currentRank };
  });

  return {
    eligible,
    toppers: ranked.filter((student) => student.rank <= limit),
  };
}
