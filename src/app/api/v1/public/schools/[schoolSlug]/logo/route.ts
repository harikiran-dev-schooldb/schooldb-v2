import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { readSchoolLogo, schoolLogoContentType } from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ schoolSlug: string }> };

export async function GET(_request: Request, { params }: Props) {
  return apiHandler(async () => {
    const { schoolSlug } = await params;
    const school = await prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { logo: true },
    });
    if (!school?.logo) throw new ApiError(404, "School logo not found.");

    const contents = await readSchoolLogo(school.logo);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": schoolLogoContentType(school.logo),
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
