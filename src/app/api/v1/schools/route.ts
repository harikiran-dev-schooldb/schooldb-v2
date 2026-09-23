import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

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
    await requireRole(["SUPER_ADMIN"]);

    const schools = await prisma.school.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        createdAt: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            memberships: true,
          },
        },
      },
    });

    return ApiResponse.success({ schools });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN"]);
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = normalizeSlug(
      typeof body.slug === "string" && body.slug.trim() ? body.slug : name,
    );

    if (!name) throw new Error("School name is required.");
    if (!slug) throw new Error("A valid school URL is required.");

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
      const playReviewUser = await prisma.user.findFirst({
        where: { phone: "9999999999" },
        select: { id: true },
      });

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
