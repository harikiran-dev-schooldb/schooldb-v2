type RteStudent = {
  isRte: boolean;
};

export function calculateRteWaiver(
  amount: number,
  concession: number,
  student: RteStudent,
) {
  if (!student.isRte) return 0;

  return Math.max(amount - concession, 0);
}
