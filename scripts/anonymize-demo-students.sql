\set ON_ERROR_STOP on

-- Sanitize the selected Demo roster and detach its student/parent accounts.
-- This removes application references to uploaded files. It does not purge
-- existing exports, external storage objects, logs, or database backups.
BEGIN;

CREATE TEMP TABLE target_demo_students ON COMMIT DROP AS
SELECT
  e.id AS enrollment_id,
  s.id AS student_id,
  school.id AS school_id,
  ay.id AS academic_year_id,
  ay."startDate" AS year_start,
  e."classId" AS class_id,
  c.name AS class_name,
  s.gender,
  s."isRte" AS is_rte,
  row_number() OVER (
    ORDER BY c."displayOrder", c.name, sec."displayOrder", sec.name, e."rollNo" NULLS LAST, s.id
  )::integer AS row_number
FROM "StudentEnrollment" e
JOIN "School" school ON school.id = e."schoolId"
JOIN "Student" s ON s.id = e."studentId" AND s."schoolId" = school.id
JOIN "Class" c ON c.id = e."classId" AND c."schoolId" = school.id
JOIN "Section" sec ON sec.id = e."sectionId" AND sec."classId" = c.id
JOIN "AcademicYear" ay ON ay.id = e."academicYearId" AND ay."schoolId" = school.id
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

-- These workflows can contain identities in free text, documents, and
-- downstream systems. Stop before updating a roster with any such history.
DO $$
DECLARE
  histories text;
BEGIN
  SELECT string_agg(DISTINCT found.kind, ', ' ORDER BY found.kind)
  INTO histories
  FROM target_demo_students target
  CROSS JOIN LATERAL (
    SELECT 'admissions' AS kind FROM "AdmissionApplication" record
      WHERE record."schoolId" = target.school_id AND record."studentId" = target.student_id
    UNION ALL
    SELECT 'support tickets' FROM "SupportTicket" record
      WHERE record."schoolId" = target.school_id AND record."studentId" = target.student_id
    UNION ALL
    SELECT 'student follow-ups' FROM "StudentEnrollment" enrollment
      JOIN "StudentFollowUp" record ON record."enrollmentId" = enrollment.id
      WHERE enrollment."schoolId" = target.school_id AND enrollment."studentId" = target.student_id
        AND record."schoolId" = target.school_id
    UNION ALL
    SELECT 'medical records' FROM "StudentHealthRecord" record
      WHERE record."schoolId" = target.school_id AND record."studentId" = target.student_id
    UNION ALL
    SELECT 'medical visits' FROM "StudentHealthVisit" record
      WHERE record."schoolId" = target.school_id AND record."studentId" = target.student_id
    UNION ALL
    SELECT 'pickup authorizations' FROM "PickupAuthorization" record
      WHERE record."schoolId" = target.school_id AND record."studentId" = target.student_id
    UNION ALL
    SELECT 'WhatsApp recipients' FROM "WhatsappRecipient" record
      WHERE record."schoolId" = target.school_id AND record."studentId" = target.student_id
    UNION ALL
    SELECT 'leave requests' FROM "LeaveRequest" record
      WHERE record."schoolId" = target.school_id AND record."studentId" = target.student_id
    UNION ALL
    SELECT 'issued certificates' FROM "CertificateIssue" record
      WHERE record."schoolId" = target.school_id AND record."studentId" = target.student_id
    UNION ALL
    SELECT 'library loans' FROM "StudentEnrollment" enrollment
      JOIN "LibraryLoan" record ON record."studentEnrollmentId" = enrollment.id
      WHERE enrollment."schoolId" = target.school_id AND enrollment."studentId" = target.student_id
        AND record."schoolId" = target.school_id
    UNION ALL
    SELECT 'transport assignments' FROM "StudentEnrollment" enrollment
      JOIN "StudentTransportAssignment" record ON record."studentEnrollmentId" = enrollment.id
      WHERE enrollment."schoolId" = target.school_id AND enrollment."studentId" = target.student_id
        AND record."schoolId" = target.school_id
    UNION ALL
    SELECT 'fee payments' FROM "StudentEnrollment" enrollment
      JOIN "FeePayment" record ON record."studentEnrollmentId" = enrollment.id
      WHERE enrollment."schoolId" = target.school_id AND enrollment."studentId" = target.student_id
        AND record."schoolId" = target.school_id
    UNION ALL
    SELECT 'Cashfree orders' FROM "StudentEnrollment" enrollment
      JOIN "CashfreePaymentOrder" record ON record."studentEnrollmentId" = enrollment.id
      WHERE enrollment."schoolId" = target.school_id AND enrollment."studentId" = target.student_id
        AND record."schoolId" = target.school_id
    UNION ALL
    SELECT 'UPI submissions' FROM "StudentEnrollment" enrollment
      JOIN "DirectUpiPaymentSubmission" record ON record."studentEnrollmentId" = enrollment.id
      WHERE enrollment."schoolId" = target.school_id AND enrollment."studentId" = target.student_id
        AND record."schoolId" = target.school_id
  ) found;
  IF histories IS NOT NULL THEN
    RAISE EXCEPTION 'The Demo roster has linked histories requiring separate review (%). No changes were made.', histories;
  END IF;
END $$;

CREATE TEMP TABLE target_demo_accounts ON COMMIT DROP AS
SELECT target.school_id, account.id AS user_id, account."clerkUserId" AS clerk_id, 'STUDENT'::"Role" AS role
FROM target_demo_students target
JOIN "Student" student ON student.id = target.student_id AND student."schoolId" = target.school_id
JOIN "User" account ON account."clerkUserId" = student."clerkId"
UNION
SELECT target.school_id, account.id, account."clerkUserId", 'PARENT'::"Role"
FROM target_demo_students target
JOIN "ParentStudentLink" link ON link."studentId" = target.student_id AND link."schoolId" = target.school_id
JOIN "User" account ON account.id = link."parentUserId";

CREATE TEMP TABLE generated_demo_identities ON COMMIT DROP AS
WITH generated AS (
  SELECT
    target.school_id,
    target.student_id,
    target.row_number,
    target.class_name,
    target.year_start,
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
SELECT
  generated.*,
  'ANON-DEMO-' || lpad(row_number::text, 4, '0') AS admission_no,
  make_date(
    CASE class_name
      WHEN 'PRE KG' THEN 2022
      WHEN 'LKG' THEN 2021
      WHEN 'UKG' THEN 2020
      WHEN 'I' THEN 2019
      WHEN 'II' THEN 2018
      ELSE extract(year FROM year_start)::integer - 12
    END,
    ((row_number - 1) % 12) + 1,
    ((row_number - 1) % 28) + 1
  ) AS demo_dob
FROM generated;

UPDATE "Student" student
SET
  "admissionNo" = generated.admission_no,
  "fullName" = generated.first_name || ' ' || generated.last_name,
  "fatherName" = 'Mr ' || generated.last_name,
  "motherName" = 'Mrs ' || generated.last_name,
  "guardianName" = 'Guardian ' || generated.last_name,
  phone = (9001000000::bigint + generated.row_number)::text,
  "fatherPhone" = (9002000000::bigint + generated.row_number)::text,
  "motherPhone" = (9003000000::bigint + generated.row_number)::text,
  "guardianPhone" = (9004000000::bigint + generated.row_number)::text,
  "alternatePhone" = (9005000000::bigint + generated.row_number)::text,
  dob = generated.demo_dob,
  "joinedDate" = generated.year_start,
  email = NULL,
  address = NULL,
  allergies = NULL,
  "apaarId" = NULL,
  "bloodGroup" = NULL,
  caste = NULL,
  category = NULL,
  city = NULL,
  "clerkId" = NULL,
  country = NULL,
  district = NULL,
  "doctorName" = NULL,
  "doctorPhone" = NULL,
  "emisNo" = NULL,
  "fatherAadhar" = NULL,
  "fatherEmail" = NULL,
  "fatherIncome" = NULL,
  "fatherOccupation" = NULL,
  "fatherQualification" = NULL,
  "guardianRelation" = NULL,
  "imageUrl" = NULL,
  "medicalConditions" = NULL,
  "motherAadhar" = NULL,
  "motherEmail" = NULL,
  "motherIncome" = NULL,
  "motherOccupation" = NULL,
  "motherQualification" = NULL,
  "motherTongue" = NULL,
  nationality = NULL,
  "penNo" = NULL,
  pincode = NULL,
  religion = NULL,
  remarks = NULL,
  state = NULL,
  "statusChangedAt" = NULL,
  "statusRemarks" = NULL,
  "studentAadhar" = NULL,
  "subCaste" = NULL,
  username = NULL,
  "whatsappOptIn" = false,
  "whatsappOptInAt" = NULL,
  "updatedAt" = now()
FROM generated_demo_identities generated
WHERE student.id = generated.student_id AND student."schoolId" = generated.school_id;

DELETE FROM "ParentStudentLink" link
USING target_demo_students target
WHERE link."studentId" = target.student_id AND link."schoolId" = target.school_id;

DELETE FROM "StudentDocument" document
USING target_demo_students target
WHERE document."studentId" = target.student_id AND document."schoolId" = target.school_id;

DELETE FROM "StudentProfileImageRequest" request
USING target_demo_students target
WHERE request."studentId" = target.student_id AND request."schoolId" = target.school_id;

-- An account linked to another Demo student or to another school is preserved.
CREATE TEMP TABLE detached_demo_memberships ON COMMIT DROP AS
SELECT membership.id, membership."userId" AS user_id, membership."schoolId" AS school_id
FROM "Membership" membership
JOIN target_demo_accounts account
  ON account.user_id = membership."userId" AND account.school_id = membership."schoolId"
 AND account.role = membership.role
WHERE NOT EXISTS (
  SELECT 1 FROM "Student" student
  WHERE student."schoolId" = account.school_id AND student."clerkId" = account.clerk_id
) AND NOT EXISTS (
  SELECT 1 FROM "ParentStudentLink" link
  WHERE link."schoolId" = account.school_id AND link."parentUserId" = account.user_id AND link.active
);

UPDATE "Membership" membership
SET "isActive" = false, "updatedAt" = now()
FROM detached_demo_memberships detached
WHERE membership.id = detached.id AND membership."schoolId" = detached.school_id;

UPDATE "PushDevice" device
SET enabled = false, "fcmToken" = NULL, "webPushSubscription" = NULL, "updatedAt" = now()
FROM detached_demo_memberships detached
WHERE device."schoolId" = detached.school_id AND device."userId" = detached.user_id;

DELETE FROM "OtpChallenge" challenge
USING detached_demo_memberships detached
WHERE challenge."schoolId" = detached.school_id AND challenge."userId" = detached.user_id;

-- Keep academic outcomes and audit event types while removing copied text.
UPDATE "Attendance" attendance
SET remarks = NULL, "updatedAt" = now()
FROM target_demo_students target
WHERE attendance."studentId" = target.student_id AND attendance."schoolId" = target.school_id
  AND attendance.remarks IS NOT NULL;

UPDATE "StudentExamMark" mark
SET remarks = NULL, "updatedAt" = now()
FROM target_demo_students target
JOIN "StudentEnrollment" enrollment
  ON enrollment."studentId" = target.student_id AND enrollment."schoolId" = target.school_id
WHERE mark."studentEnrollmentId" = enrollment.id AND mark."schoolId" = target.school_id
  AND mark.remarks IS NOT NULL;

UPDATE "StudentActivity" activity
SET title = 'Demo student activity', description = NULL, metadata = NULL,
    "performedByUserId" = CASE WHEN EXISTS (
      SELECT 1 FROM detached_demo_memberships detached
      WHERE detached.school_id = activity."schoolId" AND detached.user_id = activity."performedByUserId"
    ) THEN NULL ELSE activity."performedByUserId" END
FROM target_demo_students target
WHERE activity."studentId" = target.student_id AND activity."schoolId" = target.school_id;

UPDATE "AuditLog" log
SET summary = 'Demo student record', metadata = NULL
FROM target_demo_students target
WHERE log."schoolId" = target.school_id
  AND log."entityType" IN ('STUDENT', 'STUDENT_COMPLETE_REPORT')
  AND log."entityId" = target.student_id;

CREATE TEMP TABLE target_demo_fee_plans ON COMMIT DROP AS
SELECT DISTINCT ON (target.enrollment_id)
  target.enrollment_id,
  target.student_id,
  target.school_id,
  target.is_rte,
  plan.id AS fee_plan_id
FROM target_demo_students target
JOIN "FeePlan" plan
  ON plan."schoolId" = target.school_id
 AND plan."academicYearId" = target.academic_year_id
WHERE plan.active = true
  AND plan.name LIKE '%TERM FEE'
  AND (
    plan."appliesToAllClasses" OR EXISTS (
      SELECT 1 FROM "FeePlanClass" plan_class
      WHERE plan_class."feePlanId" = plan.id AND plan_class."classId" = target.class_id
    )
  )
ORDER BY target.enrollment_id, plan."appliesToAllClasses", plan.name;

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
  mapping.school_id,
  mapping.enrollment_id,
  mapping.fee_plan_id,
  now(),
  true,
  now(),
  now()
FROM target_demo_fee_plans mapping
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
 AND student_fee."schoolId" = mapping.school_id
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
 AND student_fee."schoolId" = mapping.school_id
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
  FROM generated_demo_identities generated
  JOIN "Student" student ON student.id = generated.student_id AND student."schoolId" = generated.school_id
  WHERE student."admissionNo" = generated.admission_no
    AND student."fullName" = generated.first_name || ' ' || generated.last_name
    AND student."fatherName" = 'Mr ' || generated.last_name
    AND student."motherName" = 'Mrs ' || generated.last_name
    AND student."guardianName" = 'Guardian ' || generated.last_name
    AND student.phone = (9001000000::bigint + generated.row_number)::text
    AND student."fatherPhone" = (9002000000::bigint + generated.row_number)::text
    AND student."motherPhone" = (9003000000::bigint + generated.row_number)::text
    AND student."guardianPhone" = (9004000000::bigint + generated.row_number)::text
    AND student."alternatePhone" = (9005000000::bigint + generated.row_number)::text
    AND student.dob = generated.demo_dob
    AND student."joinedDate" = generated.year_start
    AND NOT student."whatsappOptIn"
    AND jsonb_strip_nulls(to_jsonb(student) - ARRAY[
      'id', 'schoolId', 'admissionNo', 'fullName', 'fatherName', 'motherName', 'guardianName',
      'phone', 'fatherPhone', 'motherPhone', 'guardianPhone', 'alternatePhone', 'dob', 'joinedDate',
      'gender', 'status', 'isRte', 'hostelRequired', 'transportRequired', 'whatsappOptIn',
      'createdAt', 'updatedAt'
    ]) = '{}'::jsonb;

  IF EXISTS (
    SELECT 1 FROM target_demo_students target
    WHERE EXISTS (
      SELECT 1 FROM "ParentStudentLink" link
      WHERE link."schoolId" = target.school_id AND link."studentId" = target.student_id
    ) OR EXISTS (
      SELECT 1 FROM "StudentDocument" document
      WHERE document."schoolId" = target.school_id AND document."studentId" = target.student_id
    ) OR EXISTS (
      SELECT 1 FROM "StudentProfileImageRequest" request
      WHERE request."schoolId" = target.school_id AND request."studentId" = target.student_id
    )
  ) OR EXISTS (
    SELECT 1 FROM detached_demo_memberships detached
    JOIN "Membership" membership ON membership.id = detached.id AND membership."schoolId" = detached.school_id
    WHERE membership."isActive"
  ) THEN
    RAISE EXCEPTION 'Demo account and file detachment verification failed. No changes were made.';
  END IF;

  SELECT count(*)
  INTO assigned_count
  FROM target_demo_fee_plans mapping
  JOIN "StudentFee" student_fee
    ON student_fee."studentEnrollmentId" = mapping.enrollment_id
   AND student_fee."feePlanId" = mapping.fee_plan_id
   AND student_fee."schoolId" = mapping.school_id;

  SELECT count(DISTINCT mapping.enrollment_id)
  INTO installment_count
  FROM target_demo_fee_plans mapping
  JOIN "StudentFee" student_fee
    ON student_fee."studentEnrollmentId" = mapping.enrollment_id
   AND student_fee."feePlanId" = mapping.fee_plan_id
   AND student_fee."schoolId" = mapping.school_id
  JOIN "StudentFeeItem" item ON item."studentFeeId" = student_fee.id
  JOIN "StudentFeeInstallment" installment ON installment."studentFeeItemId" = item.id;

  IF anonymized_count <> 500 OR assigned_count <> 500 OR installment_count <> 500 THEN
    RAISE EXCEPTION
      'Verification failed (anonymized %, assigned %, with installments %). No changes were made.',
      anonymized_count, assigned_count, installment_count;
  END IF;
END $$;

SELECT
  (SELECT count(*) FROM generated_demo_identities) AS anonymized_students,
  count(DISTINCT student_fee.id) AS fee_assignments,
  count(DISTINCT fee_installment.id) AS student_fee_installments
FROM target_demo_fee_plans mapping
JOIN "StudentFee" student_fee
  ON student_fee."studentEnrollmentId" = mapping.enrollment_id
 AND student_fee."feePlanId" = mapping.fee_plan_id
 AND student_fee."schoolId" = mapping.school_id
LEFT JOIN "StudentFeeItem" fee_item ON fee_item."studentFeeId" = student_fee.id
LEFT JOIN "StudentFeeInstallment" fee_installment ON fee_installment."studentFeeItemId" = fee_item.id;

COMMIT;
