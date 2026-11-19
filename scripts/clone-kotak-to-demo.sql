-- Production-safe Kotak -> Demo clone.
-- Intended for the Neon SQL Editor on the production branch.
-- The transaction aborts unless the expected source and empty target exist.

BEGIN;

DO $$
DECLARE
  target_students integer;
  source_teacher integer;
  conflicting_teacher integer;
BEGIN
  SELECT count(*) INTO target_students
  FROM "Student" student
  JOIN "School" school ON school.id = student."schoolId"
  WHERE school.slug = 'demo';

  SELECT count(*) INTO source_teacher
  FROM "Teacher" teacher
  JOIN "School" school ON school.id = teacher."schoolId"
  WHERE school.slug = 'demo' AND lower(teacher."employeeId") = 'kss_001';

  SELECT count(*) INTO conflicting_teacher
  FROM "Teacher" teacher
  JOIN "School" school ON school.id = teacher."schoolId"
  WHERE school.slug = 'demo' AND lower(teacher."employeeId") = 'demo_001';

  IF target_students <> 0 THEN
    RAISE EXCEPTION 'Expected Demo to be empty, found % students. No changes were made.', target_students;
  END IF;
  IF source_teacher <> 1 OR conflicting_teacher <> 0 THEN
    RAISE EXCEPTION 'Demo employee-ID guard failed (kss_001 %, demo_001 %). No changes were made.', source_teacher, conflicting_teacher;
  END IF;
END $$;

CREATE TEMP TABLE generated_demo_students ON COMMIT DROP AS
WITH source_templates AS (
  SELECT
    student.gender,
    student."isRte" AS is_rte,
    syllabus.name AS syllabus_name,
    branch.name AS branch_name,
    class.name AS class_name,
    section.name AS section_name,
    row_number() OVER (
      ORDER BY syllabus.name, branch.name, class."displayOrder", section."displayOrder",
               enrollment."rollNo" NULLS LAST, student."admissionNo"
    ) AS template_number,
    count(*) OVER () AS template_count
  FROM "Student" student
  JOIN "School" school ON school.id = student."schoolId"
  JOIN "StudentEnrollment" enrollment
    ON enrollment."studentId" = student.id AND enrollment."schoolId" = school.id
  JOIN "AcademicYear" year ON year.id = enrollment."academicYearId" AND year."schoolId" = school.id
  JOIN "Class" class ON class.id = enrollment."classId" AND class."schoolId" = school.id
  JOIN "Section" section ON section.id = enrollment."sectionId" AND section."classId" = class.id
  JOIN "AcademicBranch" branch ON branch.id = class."branchId" AND branch."schoolId" = school.id
  JOIN "Syllabus" syllabus ON syllabus.id = branch."syllabusId" AND syllabus."schoolId" = school.id
  WHERE school.slug = 'kotak'
    AND year.name = '2026-27'
    AND enrollment.active = true
    AND student.status = 'ACTIVE'
), numbered AS (
  SELECT
    series.student_number,
    template.gender,
    template.is_rte,
    template.syllabus_name,
    template.branch_name,
    template.class_name,
    template.section_name,
    CASE
      WHEN template.gender = 'MALE' THEN
        (ARRAY[
          'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Reyansh',
          'Vihaan', 'Krishna', 'Ishaan', 'Sai', 'Atharv',
          'Dhruv', 'Kabir', 'Rohan', 'Karthik', 'Nikhil',
          'Rahul', 'Varun', 'Harsh', 'Manav', 'Yash',
          'Dev', 'Arnav', 'Ayaan', 'Ritvik', 'Siddharth'
        ])[((series.student_number - 1) % 25) + 1]
      WHEN template.gender = 'FEMALE' THEN
        (ARRAY[
          'Aadhya', 'Ananya', 'Diya', 'Ira', 'Myra',
          'Saanvi', 'Aarohi', 'Anika', 'Kavya', 'Meera',
          'Nandini', 'Riya', 'Tara', 'Ishita', 'Navya',
          'Prisha', 'Avni', 'Kiara', 'Shruti', 'Tanvi',
          'Veda', 'Aisha', 'Charvi', 'Lavanya', 'Mira'
        ])[((series.student_number - 1) % 25) + 1]
      ELSE 'Student'
    END AS first_name,
    (ARRAY[
      'Sharma', 'Reddy', 'Patel', 'Rao', 'Kumar',
      'Nair', 'Iyer', 'Verma', 'Gupta', 'Mehta',
      'Joshi', 'Singh', 'Das', 'Naidu', 'Kapoor',
      'Menon', 'Bose', 'Kulkarni', 'Mishra', 'Chopra'
    ])[(((series.student_number - 1) / 25) % 20) + 1] AS last_name
  FROM generate_series(1, 500) AS series(student_number)
  JOIN source_templates template
    ON template.template_number = ((series.student_number - 1) % template.template_count) + 1
)
SELECT
  numbered.*,
  target_school.id AS school_id,
  target_year.id AS academic_year_id,
  target_year."startDate" AS academic_year_start,
  target_class.id AS class_id,
  target_section.id AS section_id,
  row_number() OVER (
    PARTITION BY target_class.id, target_section.id
    ORDER BY numbered.student_number
  )::integer AS roll_number
FROM numbered
JOIN "School" target_school ON target_school.slug = 'demo'
JOIN "AcademicYear" target_year
  ON target_year."schoolId" = target_school.id
 AND target_year.name = '2026-27'
JOIN "Syllabus" target_syllabus
  ON target_syllabus."schoolId" = target_school.id
 AND target_syllabus.name = numbered.syllabus_name
JOIN "AcademicBranch" target_branch
  ON target_branch."schoolId" = target_school.id
 AND target_branch."syllabusId" = target_syllabus.id
 AND target_branch.name = numbered.branch_name
JOIN "Class" target_class
  ON target_class."schoolId" = target_school.id
 AND target_class."branchId" = target_branch.id
 AND target_class.name = numbered.class_name
JOIN "Section" target_section
  ON target_section."classId" = target_class.id
 AND target_section.name = numbered.section_name;

DO $$
DECLARE
  generated_count integer;
BEGIN
  SELECT count(*) INTO generated_count FROM generated_demo_students;
  IF generated_count <> 500 THEN
    RAISE EXCEPTION 'Expected 500 mapped Demo students, generated %. Check the active Kotak enrollments and matching Demo academic structure.', generated_count;
  END IF;
END $$;

INSERT INTO "Student" (
  id,
  "admissionNo",
  gender,
  dob,
  "schoolId",
  "fullName",
  phone,
  "alternatePhone",
  "fatherName",
  "fatherPhone",
  "motherName",
  "motherPhone",
  "guardianName",
  "guardianPhone",
  "joinedDate",
  status,
  "isRte",
  remarks,
  "whatsappOptIn",
  "createdAt",
  "updatedAt"
)
SELECT
  'demo_student_' || lpad(student_number::text, 4, '0'),
  'DEMO-' || lpad(student_number::text, 4, '0'),
  gender,
  make_date(2010 + ((student_number - 1) % 2), ((student_number - 1) % 12) + 1, ((student_number - 1) % 28) + 1),
  school_id,
  first_name || ' ' || last_name,
  (9101000000::bigint + student_number)::text,
  (9102000000::bigint + student_number)::text,
  'Mr ' || last_name,
  (9103000000::bigint + student_number)::text,
  'Mrs ' || last_name,
  (9104000000::bigint + student_number)::text,
  'Guardian ' || last_name,
  (9105000000::bigint + student_number)::text,
  academic_year_start,
  'ACTIVE',
  is_rte,
  'Fictional record generated from the Kotak class distribution for the Demo school.',
  false,
  now(),
  now()
FROM generated_demo_students;

INSERT INTO "StudentEnrollment" (
  id,
  "schoolId",
  "studentId",
  "academicYearId",
  "classId",
  "sectionId",
  "rollNo",
  "admissionDate",
  active,
  "createdAt",
  "updatedAt"
)
SELECT
  'demo_enrollment_' || lpad(student_number::text, 4, '0'),
  school_id,
  'demo_student_' || lpad(student_number::text, 4, '0'),
  academic_year_id,
  class_id,
  section_id,
  roll_number,
  academic_year_start,
  true,
  now(),
  now()
FROM generated_demo_students;

CREATE TEMP TABLE target_demo_fee_plan ON COMMIT DROP AS
SELECT
  plan.id AS fee_plan_id,
  plan."appliesToAllClasses" AS applies_to_all_classes,
  item.id AS fee_plan_item_id,
  item."feeCategoryId" AS fee_category_id,
  item.amount,
  year."startDate" AS year_start,
  year."endDate" AS year_end
FROM "FeePlan" plan
JOIN "School" school ON school.id = plan."schoolId"
JOIN "AcademicYear" year ON year.id = plan."academicYearId" AND year."schoolId" = school.id
JOIN "FeePlanItem" item ON item."feePlanId" = plan.id
WHERE school.slug = 'demo'
  AND year.name = '2026-27'
  AND plan.name = 'IX, X TERM FEE'
  AND plan.active = true;

DO $$
DECLARE
  plan_item_count integer;
BEGIN
  SELECT count(*) INTO plan_item_count FROM target_demo_fee_plan;
  IF plan_item_count <> 1 THEN
    RAISE EXCEPTION 'Expected one Demo IX/X term fee item, found %. No changes were made.', plan_item_count;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM generated_demo_students generated
    CROSS JOIN target_demo_fee_plan plan
    WHERE NOT plan.applies_to_all_classes
      AND NOT EXISTS (
        SELECT 1
        FROM "FeePlanClass" plan_class
        WHERE plan_class."feePlanId" = plan.fee_plan_id
          AND plan_class."classId" = generated.class_id
      )
  ) THEN
    RAISE EXCEPTION 'The Demo IX/X term fee plan does not cover every generated class. No changes were made.';
  END IF;
END $$;

INSERT INTO "FeeInstallment" (
  id,
  "feePlanItemId",
  name,
  amount,
  "dueDate",
  sequence,
  "periodStart",
  "periodEnd",
  "createdAt",
  "updatedAt"
)
SELECT
  'demo_fee_installment_' || quarter.sequence,
  plan.fee_plan_item_id,
  'Quarter ' || quarter.sequence,
  plan.amount,
  (plan.year_start + make_interval(months => quarter.month_offset))::date,
  quarter.sequence,
  (plan.year_start + make_interval(months => quarter.month_offset))::date,
  least(
    plan.year_end::date,
    ((plan.year_start + make_interval(months => quarter.month_offset + 3))::date - 1)
  ),
  now(),
  now()
FROM target_demo_fee_plan plan
CROSS JOIN (VALUES (1, 0), (2, 3), (3, 6), (4, 9)) AS quarter(sequence, month_offset)
WHERE NOT EXISTS (
  SELECT 1 FROM "FeeInstallment" existing
  WHERE existing."feePlanItemId" = plan.fee_plan_item_id
);

INSERT INTO "StudentFee" (
  id,
  "schoolId",
  "studentEnrollmentId",
  "feePlanId",
  "assignedAt",
  active,
  "createdAt",
  "updatedAt"
)
SELECT
  'demo_student_fee_' || lpad(generated.student_number::text, 4, '0'),
  generated.school_id,
  'demo_enrollment_' || lpad(generated.student_number::text, 4, '0'),
  plan.fee_plan_id,
  now(),
  true,
  now(),
  now()
FROM generated_demo_students generated
CROSS JOIN target_demo_fee_plan plan;

INSERT INTO "StudentFeeItem" (
  id,
  "studentFeeId",
  "feePlanItemId",
  "feeCategoryId",
  amount,
  "rteWaiver",
  concession,
  "finalAmount",
  "createdAt",
  "updatedAt"
)
SELECT
  'demo_student_fee_item_' || lpad(generated.student_number::text, 4, '0'),
  'demo_student_fee_' || lpad(generated.student_number::text, 4, '0'),
  plan.fee_plan_item_id,
  plan.fee_category_id,
  plan.amount,
  CASE WHEN generated.is_rte THEN plan.amount ELSE 0 END,
  0,
  CASE WHEN generated.is_rte THEN 0 ELSE plan.amount END,
  now(),
  now()
FROM generated_demo_students generated
CROSS JOIN target_demo_fee_plan plan;

INSERT INTO "StudentFeeInstallment" (
  id,
  "studentFeeItemId",
  "feeInstallmentId",
  name,
  amount,
  "rteWaiver",
  concession,
  "payableAmount",
  "paidAmount",
  "dueDate",
  status,
  sequence,
  "periodStart",
  "periodEnd",
  "createdAt",
  "updatedAt"
)
SELECT
  'demo_student_term_' || lpad(generated.student_number::text, 4, '0') || '_' || installment.sequence,
  'demo_student_fee_item_' || lpad(generated.student_number::text, 4, '0'),
  installment.id,
  installment.name,
  installment.amount,
  CASE WHEN generated.is_rte THEN installment.amount ELSE 0 END,
  0,
  CASE WHEN generated.is_rte THEN 0 ELSE installment.amount END,
  0,
  installment."dueDate",
  CASE
    WHEN generated.is_rte THEN 'WAIVED'::"StudentFeeInstallmentStatus"
    ELSE 'PENDING'::"StudentFeeInstallmentStatus"
  END,
  installment.sequence,
  installment."periodStart",
  installment."periodEnd",
  now(),
  now()
FROM generated_demo_students generated
CROSS JOIN target_demo_fee_plan plan
JOIN "FeeInstallment" installment
  ON installment."feePlanItemId" = plan.fee_plan_item_id;

UPDATE "Teacher" teacher
SET "employeeId" = 'demo_001', "updatedAt" = now()
FROM "School" school
WHERE teacher."schoolId" = school.id
  AND school.slug = 'demo'
  AND lower(teacher."employeeId") = 'kss_001';

DO $$
DECLARE
  student_count integer;
  enrollment_count integer;
  fee_count integer;
  term_count integer;
  renamed_teacher_count integer;
BEGIN
  SELECT count(*) INTO student_count
  FROM "Student" student
  JOIN "School" school ON school.id = student."schoolId"
  WHERE school.slug = 'demo';

  SELECT count(*) INTO enrollment_count
  FROM "StudentEnrollment" enrollment
  JOIN "School" school ON school.id = enrollment."schoolId"
  WHERE school.slug = 'demo';

  SELECT count(*) INTO fee_count
  FROM "StudentFee" fee
  JOIN "School" school ON school.id = fee."schoolId"
  WHERE school.slug = 'demo';

  SELECT count(*) INTO term_count
  FROM "StudentFeeInstallment" term
  JOIN "StudentFeeItem" item ON item.id = term."studentFeeItemId"
  JOIN "StudentFee" fee ON fee.id = item."studentFeeId"
  JOIN "School" school ON school.id = fee."schoolId"
  WHERE school.slug = 'demo';

  SELECT count(*) INTO renamed_teacher_count
  FROM "Teacher" teacher
  JOIN "School" school ON school.id = teacher."schoolId"
  WHERE school.slug = 'demo' AND lower(teacher."employeeId") = 'demo_001';

  IF student_count <> 500 OR enrollment_count <> 500 OR fee_count <> 500 OR term_count <> 2000 OR renamed_teacher_count <> 1 THEN
    RAISE EXCEPTION
      'Verification failed (students %, enrollments %, fees %, terms %, demo_001 %). No changes were made.',
      student_count, enrollment_count, fee_count, term_count, renamed_teacher_count;
  END IF;
END $$;

COMMIT;

SELECT
  school.slug,
  (SELECT count(*) FROM "Student" student WHERE student."schoolId" = school.id) AS students,
  (SELECT count(*) FROM "StudentEnrollment" enrollment WHERE enrollment."schoolId" = school.id) AS enrollments,
  (SELECT count(*) FROM "StudentFee" fee WHERE fee."schoolId" = school.id) AS fee_assignments,
  (
    SELECT count(*)
    FROM "StudentFee" fee
    JOIN "StudentFeeItem" item ON item."studentFeeId" = fee.id
    JOIN "StudentFeeInstallment" term ON term."studentFeeItemId" = item.id
    WHERE fee."schoolId" = school.id
  ) AS fee_installments
FROM "School" school
WHERE school.slug = 'demo';

SELECT school.slug, teacher."employeeId", teacher."fullName"
FROM "Teacher" teacher
JOIN "School" school ON school.id = teacher."schoolId"
WHERE school.slug = 'demo' AND teacher."employeeId" = 'demo_001';
