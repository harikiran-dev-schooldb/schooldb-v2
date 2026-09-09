import { z } from "zod";

import { prisma } from "@/lib/prisma";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value || null);

export const certificateSettingSchema = z.object({
  headerSubtitle: z.string().trim().min(1).max(120),
  bonafideContent: z.string().trim().min(1).max(3000),
  studyContent: z.string().trim().min(1).max(3000),
  transferContent: z.string().trim().min(1).max(3000),
  footerNote: optionalText(300),
  signatoryLabel: z.string().trim().min(1).max(100),
});

export async function saveCertificateSetting(schoolId: string, value: unknown) {
  const input = certificateSettingSchema.parse(value);
  return prisma.schoolCertificateSetting.upsert({
    where: { schoolId },
    create: { schoolId, ...input },
    update: input,
    select: {
      headerSubtitle: true,
      bonafideContent: true,
      studyContent: true,
      transferContent: true,
      footerNote: true,
      signatoryLabel: true,
    },
  });
}
