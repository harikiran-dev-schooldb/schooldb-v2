import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { ApiError } from "@/lib/errors";
import { isSchoolSlug } from "@/lib/tenant-context";
import { publicSchoolLogoUrl } from "@/lib/school-branding";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export async function GET() {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    if (actor.role !== "SUPER_ADMIN") throw new ApiError(403, "Super administrator required.");

    const schools = await prisma.school.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ApiResponse.success({
      schools: schools.map((school) => ({
        ...school,
        logo: publicSchoolLogoUrl(school.slug, school.logo, school.updatedAt),
      })),
    });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN"]);
    if (membership.role !== "SUPER_ADMIN") throw new ApiError(403, "Super administrator required.");
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = normalizeSlug(
      typeof body.slug === "string" && body.slug.trim() ? body.slug : name,
    );

    if (!name) throw new Error("School name is required.");
    if (!isSchoolSlug(slug) || slug.length > 80) throw new ApiError(400, "A valid, non-reserved school URL is required.");
    if (name.length > 200) throw new ApiError(400, "School name is too long.");

    const existing = await prisma.school.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new Error("A school with this URL already exists.");
    }

    const school = await prisma.school.create({
      data: { name, slug },
    });

    try {
      const reviewSlug = process.env.PLAY_REVIEW_SCHOOL_SLUG?.trim();
      const playReviewUser = reviewSlug === slug && /^(?:demo|testing)(?:-|$)/.test(slug)
        ? await prisma.user.findFirst({ where: { phone: "9999999999" }, select: { id: true } })
        : null;

      await prisma.$transaction([
        prisma.membership.create({
          data: {
            userId: membership.userId,
            schoolId: school.id,
            role: "SUPER_ADMIN",
            isActive: true,
          },
        }),
        ...(playReviewUser && playReviewUser.id !== membership.userId
          ? [
              prisma.membership.upsert({
                where: {
                  userId_schoolId: {
                    userId: playReviewUser.id,
                    schoolId: school.id,
                  },
                },
                update: {
                  role: "SCHOOL_ADMIN",
                  isActive: true,
                },
                create: {
                  userId: playReviewUser.id,
                  schoolId: school.id,
                  role: "SCHOOL_ADMIN",
                  isActive: true,
                },
              }),
            ]
          : []),
      ]);
    } catch (error) {
      await prisma.school.delete({ where: { id: school.id } }).catch(() => undefined);
      throw error;
    }

    return ApiResponse.success(
      { school },
      "School created successfully.",
      201,
    );
  });
}
