import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { safelyProvisionStudentLogin } from "../src/features/auth/account-provisioning";

const SCHOOL_SLUG = process.env.SCHOOL_SLUG ?? "testing";
const BATCH_SIZE = 5;

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!secretKey?.startsWith("sk_live_")) {
    throw new Error("ABORTED: CLERK_SECRET_KEY is not a production Clerk key.");
  }

  if (!databaseUrl) {
    throw new Error("ABORTED: DATABASE_URL is missing.");
  }

  if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")) {
    throw new Error("ABORTED: DATABASE_URL points to a local database.");
  }

  console.log("Environment: PRODUCTION");
  console.log(`School: ${SCHOOL_SLUG}`);

  const school = await prisma.school.findUnique({
    where: {
      slug: SCHOOL_SLUG,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!school) {
    throw new Error(
      `School "${SCHOOL_SLUG}" was not found in the production database.`,
    );
  }

  console.log(`School found: ${school.name}`);
  console.log(`School ID: ${school.id}`);

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      phone: true,
      fatherPhone: true,
      motherPhone: true,
      guardianPhone: true,
      clerkId: true,
    },
    orderBy: {
      admissionNo: "asc",
    },
  });

  console.log("");
  console.log(`Active students found: ${students.length}`);

  const alreadyLinked = students.filter((student) => student.clerkId).length;

  console.log(`Already linked students: ${alreadyLinked}`);
  console.log(
    `Students requiring provisioning: ${students.length - alreadyLinked}`,
  );

  console.log("");
  console.log("Starting account provisioning...");
  console.log("");

  let processed = 0;
  let provisioned = 0;
  let skipped = 0;
  let failed = 0;

  let studentAccounts = 0;
  let parentAccounts = 0;

  const failures: Array<{
    admissionNo: string;
    name: string | null;
    message: string;
  }> = [];

  for (let index = 0; index < students.length; index += BATCH_SIZE) {
    const batch = students.slice(index, index + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (student) => {
        const result = await safelyProvisionStudentLogin(student.id, school.id);

        return {
          student,
          result,
        };
      }),
    );

    for (const { student, result } of results) {
      processed += 1;

      if (result.status === "PROVISIONED") {
        provisioned += 1;

        if (result.accounts.includes("STUDENT")) {
          studentAccounts += 1;
        }
      } else if (result.status === "SKIPPED") {
        skipped += 1;
      } else {
        failed += 1;

        failures.push({
          admissionNo: student.admissionNo,
          name: student.fullName,
          message: result.message,
        });
      }
    }

    console.log(
      `Processed ${processed}/${students.length} | ` +
        `Provisioned: ${provisioned} | ` +
        `Skipped: ${skipped} | ` +
        `Failed: ${failed}`,
    );
  }

  console.log("");
  console.log("======================================");
  console.log("PROVISIONING COMPLETED");
  console.log("======================================");
  console.log(`Students processed: ${processed}`);
  console.log(`Provisioned: ${provisioned}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log("");
  console.log(`Student account assignments: ${studentAccounts}`);
  console.log(`Parent account assignments: ${parentAccounts}`);

  if (failures.length > 0) {
    console.log("");
    console.log("FAILED STUDENTS");
    console.log("--------------------------------------");

    for (const failure of failures) {
      console.log(
        `${failure.admissionNo} | ${failure.name ?? ""} | ${failure.message}`,
      );
    }
  }

  console.log("");
  console.log("Finished.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
