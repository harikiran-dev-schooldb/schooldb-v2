CREATE TYPE "ExamAssessmentType" AS ENUM ('MARKS', 'GRADE');

ALTER TABLE "ExamSchedule"
ADD COLUMN "assessmentType" "ExamAssessmentType" NOT NULL DEFAULT 'MARKS';

ALTER TABLE "StudentExamMark"
ADD COLUMN "grade" VARCHAR(5);
