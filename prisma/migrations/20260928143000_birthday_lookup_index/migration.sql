CREATE INDEX "Student_active_birthday_idx"
ON "Student" (
  (EXTRACT(MONTH FROM "dob")),
  (EXTRACT(DAY FROM "dob")),
  "schoolId"
)
WHERE "status" = 'ACTIVE';
