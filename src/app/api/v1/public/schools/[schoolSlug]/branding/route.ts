import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { publicSchoolLogoUrl } from "@/lib/school-branding";

type Props = { params: Promise<{ schoolSlug: string }> };

export async function GET(_request: Request, { params }: Props) {
  return apiHandler(async () => {
    const { schoolSlug } = await params;
    const school = await prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { name: true, slug: true, logo: true, updatedAt: true },
    });
    if (!school) return ApiResponse.error("School not found.", 404);

    return ApiResponse.success({
      school: {
        name: school.name,
        slug: school.slug,
        logo: publicSchoolLogoUrl(school.slug, school.logo, school.updatedAt),
      },
    });
  });
}
