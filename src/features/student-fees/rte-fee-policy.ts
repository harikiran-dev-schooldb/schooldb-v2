type RteStudent = {
  isRte: boolean;
  category: string | null;
};

export function isRteFeeExempt(student: RteStudent) {
  return student.isRte || student.category === "RTE";
}
