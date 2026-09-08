import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const idCardSettingSchema = z.object({
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]),
  widthMm: z.coerce.number().min(40).max(150),
  heightMm: z.coerce.number().min(40).max(150),
  showBack: z.boolean(),
  backImageUrl: z.string().trim().max(2000).nullable().optional().transform((value) => value || null),
  backContent: z.string().trim().max(1000).nullable().optional().transform((value) => value || null),
});

export const DEFAULT_ID_CARD_SETTING = {
  orientation: "PORTRAIT" as const,
  widthMm: 54,
  heightMm: 85.6,
  showBack: true,
  backImageUrl: null,
  backContent: null,
};

export async function saveIdCardSetting(schoolId: string, value: unknown) {
  const input = idCardSettingSchema.parse(value);
  return prisma.schoolIdCardSetting.upsert({
    where: { schoolId },
    create: { schoolId, ...input },
    update: input,
    select: { orientation: true, widthMm: true, heightMm: true, showBack: true, backImageUrl: true, backContent: true },
  });
}
