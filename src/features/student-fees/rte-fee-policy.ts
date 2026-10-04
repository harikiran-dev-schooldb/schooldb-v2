type RteStudent = {
  isRte: boolean;
};

export function isRteFeeExempt(student: RteStudent) {
  return student.isRte;
}
