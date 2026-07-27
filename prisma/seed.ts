import { PrismaClient } from "@/generated/prisma/client";
import "dotenv/config";


const prisma = new PrismaClient();

async function main() {
  await prisma.school.upsert({
    where: {
      slug: "demo",
    },
    update: {},
    create: {
      name: "Demo School",
      slug: "demo",
    },
  });

  console.log("✅ Demo school created");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });