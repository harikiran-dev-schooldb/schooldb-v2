\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE target_demo_students ON COMMIT DROP AS
SELECT
  e.id AS enrollment_id,
  s.id AS student_id,
  e."classId" AS class_id,
  c.name AS class_name,
  s.gender,
  s."isRte" AS is_rte,
  row_number() OVER (
    ORDER BY c."displayOrder", c.name, sec."displayOrder", sec.name, e."rollNo" NULLS LAST, s."admissionNo"
  )::integer AS row_number
FROM "StudentEnrollment" e
JOIN "Student" s ON s.id = e."studentId"
JOIN "Class" c ON c.id = e."classId"
JOIN "Section" sec ON sec.id = e."sectionId"
JOIN "AcademicYear" ay ON ay.id = e."academicYearId"
JOIN "School" school ON school.id = e."schoolId"
WHERE school.slug = 'demo'
  AND ay.name = '2026-27'
  AND s."admissionNo" NOT IN ('00001', '00002')
  AND s."admissionNo" NOT LIKE 'DEMO-%';

DO $$
DECLARE
  target_count integer;
BEGIN
  SELECT count(*) INTO target_count FROM target_demo_students;
  IF target_count <> 500 THEN
    RAISE EXCEPTION 'Expected exactly 500 demo students, found %. No changes were made.', target_count;
  END IF;
END $$;

WITH generated AS (
  SELECT
    target.student_id,
    target.row_number,
    target.class_name,
    CASE
      WHEN target.gender = 'MALE' THEN
        (ARRAY[
          'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Reyansh',
          'Vihaan', 'Krishna', 'Ishaan', 'Sai', 'Atharv',
          'Dhruv', 'Kabir', 'Rohan', 'Karthik', 'Nikhil',
          'Rahul', 'Varun', 'Harsh', 'Manav', 'Yash',
          'Dev', 'Arnav', 'Ayaan', 'Ritvik', 'Siddharth'
        ])[((target.row_number - 1) % 25) + 1]
      WHEN target.gender = 'FEMALE' THEN
        (ARRAY[
          'Aadhya', 'Ananya', 'Diya', 'Ira', 'Myra',
          'Saanvi', 'Aarohi', 'Anika', 'Kavya', 'Meera',
          'Nandini', 'Riya', 'Tara', 'Ishita', 'Navya',
          'Prisha', 'Avni', 'Kiara', 'Shruti', 'Tanvi',
          'Veda', 'Aisha', 'Charvi', 'Lavanya', 'Mira'
        ])[((target.row_number - 1) % 25) + 1]
      ELSE 'Student'
    END AS first_name,
    (ARRAY[
      'Sharma', 'Reddy', 'Patel', 'Rao', 'Kumar',
      'Nair', 'Iyer', 'Verma', 'Gupta', 'Mehta',
      'Joshi', 'Singh', 'Das', 'Naidu', 'Kapoor',
      'Menon', 'Bose', 'Kulkarni', 'Mishra', 'Chopra'
    ])[(((target.row_number - 1) / 25) % 20) + 1] AS last_name
  FROM target_demo_students target
)
UPDATE "Student" student
SET
  "fullName" = generated.first_name || ' ' || generated.last_name,
  phone = (9001000000::bigint + generated.row_number)::text,
  "fatherPhone" = (9002000000::bigint + generated.row_number)::text,
  "motherPhone" = (9003000000::bigint + generated.row_number)::text,
  "guardianPhone" = (9004000000::bigint + generated.row_number)::text,
  "alternatePhone" = (9005000000::bigint + generated.row_number)::text,
  dob = make_date(
    CASE generated.class_name
      WHEN 'PRE KG' THEN 2022
      WHEN 'LKG' THEN 2021
      WHEN 'UKG' THEN 2020
      WHEN 'I' THEN 2019
      WHEN 'II' THEN 2018
      ELSE 2019
    END,
    ((generated.row_number - 1) % 12) + 1,
    ((generated.row_number - 1) % 28) + 1
  ),
  "whatsappOptIn" = false,
  "whatsappOptInAt" = NULL,
  "updatedAt" = now()
FROM generated
WHERE student.id = generated.student_id;

CREATE TEMP TABLE target_demo_fee_plans ON COMMIT DROP AS
SELECT DISTINCT ON (target.enrollment_id)
  target.enrollment_id,
  target.student_id,
  target.is_rte,
  plan.id AS fee_plan_id
FROM target_demo_students target
JOIN "FeePlanClass" plan_class ON plan_class."classId" = target.class_id
JOIN "FeePlan" plan ON plan.id = plan_class."feePlanId"
JOIN "AcademicYear" ay ON ay.id = plan."academicYearId"
WHERE ay.name = '2026-27'
  AND plan.active = true
  AND plan.name LIKE '%TERM FEE'
ORDER BY target.enrollment_id, plan.name;

DO $$
DECLARE
  mapped_count integer;
BEGIN
  SELECT count(*) INTO mapped_count FROM target_demo_fee_plans;
  IF mapped_count <> 500 THEN
    RAISE EXCEPTION 'Expected fee plans for all 500 demo students, mapped %. No changes were made.', mapped_count;
  END IF;
END $$;

-- Complete quarterly installment definitions for any target term plan that
-- has not had installments generated yet (currently LKG/UKG).
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
  'demo_fi_' || substr(md5(item.id || ':' || quarter.sequence::text), 1, 24),
  item.id,
  'Quarter ' || quarter.sequence,
  item.amount,
  (year."startDate" + make_interval(months => quarter.month_offset))::date,
  quarter.sequence,
  (year."startDate" + make_interval(months => quarter.month_offset))::date,
  least(
    year."endDate"::date,
    ((year."startDate" + make_interval(months => quarter.month_offset + 3))::date - 1)
  ),
  now(),
  now()
FROM (
  SELECT DISTINCT fee_plan_id FROM target_demo_fee_plans
) target_plan
JOIN "FeePlan" plan ON plan.id = target_plan.fee_plan_id
JOIN "AcademicYear" year ON year.id = plan."academicYearId"
JOIN "FeePlanItem" item ON item."feePlanId" = plan.id
CROSS JOIN (VALUES (1, 0), (2, 3), (3, 6), (4, 9)) AS quarter(sequence, month_offset)
WHERE item.frequency = 'QUARTERLY'
  AND NOT EXISTS (
    SELECT 1 FROM "FeeInstallment" existing
    WHERE existing."feePlanItemId" = item.id
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
  'demo_sf_' || substr(md5(mapping.enrollment_id || ':' || mapping.fee_plan_id), 1, 24),
  school.id,
  mapping.enrollment_id,
  mapping.fee_plan_id,
  now(),
  true,
  now(),
  now()
FROM target_demo_fee_plans mapping
CROSS JOIN (SELECT id FROM "School" WHERE slug = 'demo') school
ON CONFLICT ("studentEnrollmentId", "feePlanId") DO NOTHING;

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
  'demo_sfi_' || substr(md5(student_fee.id || ':' || plan_item.id), 1, 24),
  student_fee.id,
  plan_item.id,
  plan_item."feeCategoryId",
  plan_item.amount,
  CASE WHEN mapping.is_rte THEN plan_item.amount ELSE 0 END,
  0,
  CASE WHEN mapping.is_rte THEN 0 ELSE plan_item.amount END,
  now(),
  now()
FROM target_demo_fee_plans mapping
JOIN "StudentFee" student_fee
  ON student_fee."studentEnrollmentId" = mapping.enrollment_id
 AND student_fee."feePlanId" = mapping.fee_plan_id
JOIN "FeePlanItem" plan_item ON plan_item."feePlanId" = mapping.fee_plan_id
WHERE NOT EXISTS (
  SELECT 1
  FROM "StudentFeeItem" existing
  WHERE existing."studentFeeId" = student_fee.id
    AND existing."feePlanItemId" = plan_item.id
);

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
  'demo_sfins_' || substr(md5(student_fee_item.id || ':' || installment.id), 1, 24),
  student_fee_item.id,
  installment.id,
  installment.name,
  installment.amount,
  CASE WHEN mapping.is_rte THEN installment.amount ELSE 0 END,
  0,
  CASE WHEN mapping.is_rte THEN 0 ELSE installment.amount END,
  0,
  installment."dueDate",
  CASE
    WHEN mapping.is_rte THEN 'WAIVED'::"StudentFeeInstallmentStatus"
    ELSE 'PENDING'::"StudentFeeInstallmentStatus"
  END,
  installment.sequence,
  installment."periodStart",
  installment."periodEnd",
  now(),
  now()
FROM target_demo_fee_plans mapping
JOIN "StudentFee" student_fee
  ON student_fee."studentEnrollmentId" = mapping.enrollment_id
 AND student_fee."feePlanId" = mapping.fee_plan_id
JOIN "StudentFeeItem" student_fee_item ON student_fee_item."studentFeeId" = student_fee.id
JOIN "FeeInstallment" installment ON installment."feePlanItemId" = student_fee_item."feePlanItemId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "StudentFeeInstallment" existing
  WHERE existing."studentFeeItemId" = student_fee_item.id
    AND existing."feeInstallmentId" = installment.id
);

DO $$
DECLARE
  anonymized_count integer;
  assigned_count integer;
  installment_count integer;
BEGIN
  SELECT count(*)
  INTO anonymized_count
  FROM target_demo_students target
  JOIN "Student" student ON student.id = target.student_id
  WHERE student.phone = (9001000000::bigint + target.row_number)::text;

  SELECT count(*)
  INTO assigned_count
  FROM target_demo_fee_plans mapping
  JOIN "StudentFee" student_fee
    ON student_fee."studentEnrollmentId" = mapping.enrollment_id
   AND student_fee."feePlanId" = mapping.fee_plan_id;

  SELECT count(DISTINCT mapping.enrollment_id)
  INTO installment_count
  FROM target_demo_fee_plans mapping
  JOIN "StudentFee" student_fee
    ON student_fee."studentEnrollmentId" = mapping.enrollment_id
   AND student_fee."feePlanId" = mapping.fee_plan_id
  JOIN "StudentFeeItem" item ON item."studentFeeId" = student_fee.id
  JOIN "StudentFeeInstallment" installment ON installment."studentFeeItemId" = item.id;

  IF anonymized_count <> 500 OR assigned_count <> 500 OR installment_count <> 500 THEN
    RAISE EXCEPTION
      'Verification failed (anonymized %, assigned %, with installments %). No changes were made.',
      anonymized_count, assigned_count, installment_count;
  END IF;
END $$;

COMMIT;

SELECT
  count(DISTINCT student.id) AS anonymized_students,
  count(DISTINCT student_fee.id) AS fee_assignments,
  count(DISTINCT fee_installment.id) AS student_fee_installments
FROM "StudentEnrollment" enrollment
JOIN "Student" student ON student.id = enrollment."studentId"
JOIN "AcademicYear" year ON year.id = enrollment."academicYearId"
JOIN "School" school ON school.id = enrollment."schoolId"
LEFT JOIN "StudentFee" student_fee ON student_fee."studentEnrollmentId" = enrollment.id
LEFT JOIN "StudentFeeItem" fee_item ON fee_item."studentFeeId" = student_fee.id
LEFT JOIN "StudentFeeInstallment" fee_installment ON fee_installment."studentFeeItemId" = fee_item.id
WHERE school.slug = 'demo'
  AND year.name = '2026-27'
  AND student."admissionNo" NOT IN ('00001', '00002')
  AND student."admissionNo" NOT LIKE 'DEMO-%';
