import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";

type ReportRow = Record<string, string | number | boolean | null>;

function date(value: Date | null | undefined) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function dateTime(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function maskedAadhaar(value: string | null) {
  if (!value) return null;
  const cleaned = value.replace(/\s/g, "");
  return cleaned.length <= 4 ? cleaned : `XXXX XXXX ${cleaned.slice(-4)}`;
}

export type StudentComprehensiveReport = {
  schoolName: string;
  studentName: string;
  admissionNo: string;
  generatedAt: string;
  sections: Array<{
    key: string;
    title: string;
    columns: string[];
    rows: ReportRow[];
  }>;
};

export async function getStudentComprehensiveReport(
  studentId: string,
  schoolId: string,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      school: { select: { name: true } },
      enrollments: {
        orderBy: { academicYear: { startDate: "desc" } },
        include: {
          academicYear: { select: { name: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
          houseAssignment: { include: { house: { select: { name: true } } } },
        },
      },
      parentLinks: {
        where: { active: true },
        include: {
          parentUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      documents: { orderBy: { createdAt: "desc" } },
      activities: {
        where: {
          NOT: { type: "ATTENDANCE_MARKED", title: "Attendance finalized" },
        },
        orderBy: { createdAt: "desc" },
        include: {
          performedBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!student) throw new ApiError(404, "Student not found.");

  const enrollmentIds = student.enrollments.map((item) => item.id);
  const [attendance, studentFees, payments, marks] = await Promise.all([
    prisma.attendance.findMany({
      where: { schoolId, studentId },
      orderBy: { session: { attendanceDate: "desc" } },
      include: {
        session: {
          include: {
            academicYear: { select: { name: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
            subject: { select: { name: true } },
            period: { select: { name: true } },
          },
        },
      },
    }),
    prisma.studentFee.findMany({
      where: { schoolId, studentEnrollmentId: { in: enrollmentIds } },
      orderBy: { assignedAt: "desc" },
      include: {
        feePlan: { select: { name: true } },
        studentEnrollment: {
          include: {
            academicYear: { select: { name: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        items: {
          include: {
            feeCategory: { select: { name: true } },
            feePlanItem: { select: { frequency: true } },
            installments: { orderBy: { sequence: "asc" } },
          },
        },
      },
    }),
    prisma.feePayment.findMany({
      where: { schoolId, studentEnrollmentId: { in: enrollmentIds } },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      include: {
        studentEnrollment: {
          include: { academicYear: { select: { name: true } } },
        },
      },
    }),
    prisma.studentExamMark.findMany({
      where: { schoolId, studentEnrollmentId: { in: enrollmentIds } },
      orderBy: [
        { examSchedule: { exam: { startDate: "desc" } } },
        { examSchedule: { examDate: "asc" } },
      ],
      include: {
        studentEnrollment: {
          include: { academicYear: { select: { name: true } } },
        },
        examSchedule: {
          include: {
            exam: { select: { name: true, status: true } },
            subject: { select: { name: true, code: true } },
          },
        },
      },
    }),
  ]);

  const attendanceCounts = attendance.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const attended =
    (attendanceCounts.PRESENT ?? 0) + (attendanceCounts.LATE ?? 0);
  const payable = studentFees
    .flatMap((fee) => fee.items.flatMap((item) => item.installments))
    .reduce((sum, item) => sum + Number(item.payableAmount), 0);
  const paid = studentFees
    .flatMap((fee) => fee.items.flatMap((item) => item.installments))
    .reduce((sum, item) => sum + Number(item.paidAmount), 0);
  const scoredMarks = marks.filter(
    (mark) =>
      mark.marksObtained !== null && Number(mark.examSchedule.maxMarks) > 0,
  );
  const scored = scoredMarks.reduce(
    (sum, mark) => sum + Number(mark.marksObtained),
    0,
  );
  const maximum = scoredMarks.reduce(
    (sum, mark) => sum + Number(mark.examSchedule.maxMarks),
    0,
  );
  const activeEnrollment =
    student.enrollments.find((item) => item.active) ??
    student.enrollments[0] ??
    null;

  const parents = [
    ...(student.fatherName || student.fatherPhone || student.fatherEmail
      ? [
          {
            Relationship: "Father",
            Name: student.fatherName,
            Phone: student.fatherPhone,
            Email: student.fatherEmail,
            Aadhaar: maskedAadhaar(student.fatherAadhar),
            Occupation: student.fatherOccupation,
            Qualification: student.fatherQualification,
            "Annual Income": text(student.fatherIncome),
          },
        ]
      : []),
    ...(student.motherName || student.motherPhone || student.motherEmail
      ? [
          {
            Relationship: "Mother",
            Name: student.motherName,
            Phone: student.motherPhone,
            Email: student.motherEmail,
            Aadhaar: maskedAadhaar(student.motherAadhar),
            Occupation: student.motherOccupation,
            Qualification: student.motherQualification,
            "Annual Income": text(student.motherIncome),
          },
        ]
      : []),
    ...(student.guardianName || student.guardianPhone
      ? [
          {
            Relationship: student.guardianRelation || "Guardian",
            Name: student.guardianName,
            Phone: student.guardianPhone,
            Email: null,
            Aadhaar: null,
            Occupation: null,
            Qualification: null,
            "Annual Income": null,
          },
        ]
      : []),
    ...student.parentLinks.map((link) => ({
      Relationship: link.relationship || "Parent",
      Name:
        [link.parentUser.firstName, link.parentUser.lastName]
          .filter(Boolean)
          .join(" ") || "Parent",
      Phone: link.parentUser.phone,
      Email: link.parentUser.email,
      Aadhaar: null,
      Occupation: null,
      Qualification: null,
      "Annual Income": null,
    })),
  ].filter(
    (parent, index, rows) =>
      !parent.Phone ||
      rows.findIndex((item) => item.Phone === parent.Phone) === index,
  );

  const details: Array<[string, string, unknown]> = [
    ["Identity", "Record ID", student.id],
    ["Identity", "Admission number", student.admissionNo],
    ["Identity", "Student name", student.fullName],
    ["Identity", "Gender", student.gender],
    ["Identity", "Date of birth", date(student.dob)],
    ["Identity", "Joined date", date(student.joinedDate)],
    ["Identity", "Status", student.status],
    ["Identity", "Username", student.username || `STD_${student.admissionNo}`],
    ["Identity", "Profile image URL", student.imageUrl],
    ["Government", "Student Aadhaar", maskedAadhaar(student.studentAadhar)],
    ["Government", "APAAR ID", student.apaarId],
    ["Government", "PEN number", student.penNo],
    ["Government", "EMIS number", student.emisNo],
    ["Demographic", "Blood group", student.bloodGroup],
    ["Demographic", "Nationality", student.nationality],
    ["Demographic", "Mother tongue", student.motherTongue],
    ["Demographic", "Religion", student.religion],
    ["Demographic", "Category", student.category],
    ["Demographic", "Caste", student.caste],
    ["Demographic", "Sub-caste", student.subCaste],
    ["Demographic", "RTE student", yesNo(student.isRte)],
    ["Contact", "Phone", student.phone],
    ["Contact", "Alternate phone", student.alternatePhone],
    ["Contact", "Email", student.email],
    ["Address", "Address", student.address],
    ["Address", "City", student.city],
    ["Address", "District", student.district],
    ["Address", "State", student.state],
    ["Address", "PIN code", student.pincode],
    ["Address", "Country", student.country],
    ["Health", "Doctor name", student.doctorName],
    ["Health", "Doctor phone", student.doctorPhone],
    ["Health", "Medical conditions", student.medicalConditions],
    ["Health", "Allergies", student.allergies],
    ["Parents", "Father's name", student.fatherName],
    ["Parents", "Father's phone", student.fatherPhone],
    ["Parents", "Father's email", student.fatherEmail],
    ["Parents", "Father's Aadhaar", maskedAadhaar(student.fatherAadhar)],
    ["Parents", "Father's occupation", student.fatherOccupation],
    ["Parents", "Father's qualification", student.fatherQualification],
    ["Parents", "Father's annual income", student.fatherIncome],
    ["Parents", "Mother's name", student.motherName],
    ["Parents", "Mother's phone", student.motherPhone],
    ["Parents", "Mother's email", student.motherEmail],
    ["Parents", "Mother's Aadhaar", maskedAadhaar(student.motherAadhar)],
    ["Parents", "Mother's occupation", student.motherOccupation],
    ["Parents", "Mother's qualification", student.motherQualification],
    ["Parents", "Mother's annual income", student.motherIncome],
    ["Parents", "Guardian name", student.guardianName],
    ["Parents", "Guardian phone", student.guardianPhone],
    ["Parents", "Guardian relationship", student.guardianRelation],
    ["Services", "Transport required", yesNo(student.transportRequired)],
    ["Services", "Hostel required", yesNo(student.hostelRequired)],
    ["Services", "WhatsApp consent", yesNo(student.whatsappOptIn)],
    ["Other", "Remarks", student.remarks],
    ["Audit", "Created", dateTime(student.createdAt)],
    ["Audit", "Last updated", dateTime(student.updatedAt)],
    ["Audit", "Status changed", dateTime(student.statusChangedAt)],
    ["Audit", "Status remarks", student.statusRemarks],
  ];

  const sections: StudentComprehensiveReport["sections"] = [
    {
      key: "overview",
      title: "Overview",
      columns: ["Metric", "Value"],
      rows: [
        { Metric: "Student", Value: student.fullName || student.admissionNo },
        { Metric: "Admission number", Value: student.admissionNo },
        {
          Metric: "Current enrollment",
          Value: activeEnrollment
            ? `${activeEnrollment.class.name} - ${activeEnrollment.section.name} (${activeEnrollment.academicYear.name})`
            : "Not enrolled",
        },
        {
          Metric: "Attendance",
          Value: attendance.length
            ? `${Math.round((attended / attendance.length) * 1000) / 10}%`
            : "No records",
        },
        { Metric: "Attendance records", Value: attendance.length },
        { Metric: "Fees payable", Value: payable },
        { Metric: "Fees paid", Value: paid },
        { Metric: "Fees outstanding", Value: Math.max(0, payable - paid) },
        {
          Metric: "Academic performance",
          Value: maximum
            ? `${Math.round((scored / maximum) * 1000) / 10}%`
            : "No marks",
        },
      ],
    },
    {
      key: "details",
      title: "All Details",
      columns: ["Section", "Field", "Value"],
      rows: details.map(([Section, Field, Value]) => ({
        Section,
        Field,
        Value: text(Value),
      })),
    },
    {
      key: "enrollment",
      title: "Enrollment",
      columns: [
        "Academic Year",
        "Class",
        "Section",
        "Roll No",
        "Admission Date",
        "House",
        "Active",
      ],
      rows: student.enrollments.map((item) => ({
        "Academic Year": item.academicYear.name,
        Class: item.class.name,
        Section: item.section.name,
        "Roll No": item.rollNo,
        "Admission Date": date(item.admissionDate),
        House: item.houseAssignment?.house.name ?? null,
        Active: yesNo(item.active),
      })),
    },
    {
      key: "attendance",
      title: "Attendance",
      columns: [
        "Date",
        "Academic Year",
        "Class",
        "Section",
        "Session",
        "Period",
        "Subject",
        "Status",
        "Remarks",
        "Locked",
      ],
      rows: attendance.map((item) => ({
        Date: date(item.session.attendanceDate),
        "Academic Year": item.session.academicYear.name,
        Class: item.session.class.name,
        Section: item.session.section.name,
        Session: item.session.sessionType || "DAILY",
        Period: item.session.period?.name ?? null,
        Subject: item.session.subject?.name ?? null,
        Status: item.status,
        Remarks: item.remarks,
        Locked: yesNo(item.session.locked),
      })),
    },
    {
      key: "fees",
      title: "Fees",
      columns: [
        "Record Type",
        "Academic Year",
        "Plan / Receipt",
        "Category / Mode",
        "Item",
        "Due / Payment Date",
        "Payable",
        "Paid",
        "Outstanding",
        "Status",
        "Reference",
      ],
      rows: [
        ...studentFees.flatMap((fee) =>
          fee.items.flatMap((item) =>
            item.installments.map((installment) => ({
              "Record Type": "Installment",
              "Academic Year": fee.studentEnrollment.academicYear.name,
              "Plan / Receipt": fee.feePlan.name,
              "Category / Mode": item.feeCategory.name,
              Item: `${item.feePlanItem.frequency} - ${installment.name}`,
              "Due / Payment Date": date(installment.dueDate),
              Payable: Number(installment.payableAmount),
              Paid: Number(installment.paidAmount),
              Outstanding: Math.max(
                0,
                Number(installment.payableAmount) -
                  Number(installment.paidAmount),
              ),
              Status: installment.status,
              Reference: null,
            })),
          ),
        ),
        ...payments.map((payment) => ({
          "Record Type": "Payment",
          "Academic Year": payment.studentEnrollment.academicYear.name,
          "Plan / Receipt": payment.receiptNo,
          "Category / Mode": payment.paymentMode,
          Item: payment.remarks || "Fee payment",
          "Due / Payment Date": date(payment.paymentDate),
          Payable: null,
          Paid: Number(payment.amount),
          Outstanding: null,
          Status: payment.status,
          Reference: payment.referenceNo,
        })),
      ],
    },
    {
      key: "results",
      title: "Results",
      columns: [
        "Academic Year",
        "Exam",
        "Exam Status",
        "Exam Date",
        "Subject",
        "Marks Obtained",
        "Maximum Marks",
        "Pass Marks",
        "Grade",
        "Status",
        "Remarks",
      ],
      rows: marks.map((mark) => ({
        "Academic Year": mark.studentEnrollment.academicYear.name,
        Exam: mark.examSchedule.exam.name,
        "Exam Status": mark.examSchedule.exam.status,
        "Exam Date": date(mark.examSchedule.examDate),
        Subject: mark.examSchedule.subject.name,
        "Marks Obtained":
          mark.marksObtained === null ? null : Number(mark.marksObtained),
        "Maximum Marks": Number(mark.examSchedule.maxMarks),
        "Pass Marks":
          mark.examSchedule.passMarks === null
            ? null
            : Number(mark.examSchedule.passMarks),
        Grade: mark.grade,
        Status: mark.status,
        Remarks: mark.remarks,
      })),
    },
    {
      key: "documents",
      title: "Documents",
      columns: [
        "Document Type",
        "Name",
        "Original File",
        "File Type",
        "Size (KB)",
        "Visible to Family",
        "Notes",
        "Uploaded",
        "Updated",
      ],
      rows: student.documents.map((document) => ({
        "Document Type": document.type,
        Name: document.name,
        "Original File": document.originalName,
        "File Type": document.mimeType,
        "Size (KB)": Math.round(document.sizeBytes / 1024),
        "Visible to Family": yesNo(document.visibleToFamily),
        Notes: document.notes,
        Uploaded: dateTime(document.createdAt),
        Updated: dateTime(document.updatedAt),
      })),
    },
    {
      key: "activity",
      title: "Activity",
      columns: [
        "Date and Time",
        "Type",
        "Title",
        "Description",
        "Performed By",
      ],
      rows: student.activities.map((activity) => ({
        "Date and Time": dateTime(activity.createdAt),
        Type: activity.type,
        Title: activity.title,
        Description: activity.description,
        "Performed By":
          [activity.performedBy?.firstName, activity.performedBy?.lastName]
            .filter(Boolean)
            .join(" ") || "System",
      })),
    },
    {
      key: "parents",
      title: "Parents",
      columns: [
        "Relationship",
        "Name",
        "Phone",
        "Email",
        "Aadhaar",
        "Occupation",
        "Qualification",
        "Annual Income",
      ],
      rows: parents,
    },
  ];

  return {
    schoolName: student.school.name,
    studentName: student.fullName || student.admissionNo,
    admissionNo: student.admissionNo,
    generatedAt: new Date().toISOString(),
    sections,
  } satisfies StudentComprehensiveReport;
}
