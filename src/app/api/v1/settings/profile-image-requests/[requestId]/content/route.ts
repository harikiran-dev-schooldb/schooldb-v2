import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { readPendingProfileImage } from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ requestId: string }> };

export async function GET(request: Request, context: Context) {
  return apiHandler(async () => {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") ?? "";
    const membership = await requireRole(
      ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      schoolSlug,
    );
    const { requestId } = await context.params;
    const imageRequest = await prisma.studentProfileImageRequest.findFirst({
      where: { id: requestId, schoolId: membership.schoolId },
      select: { storageKey: true, mimeType: true },
    });
    if (!imageRequest) {
      return new Response("Profile image request not found.", { status: 404 });
    }
    const contents = await readPendingProfileImage(imageRequest.storageKey);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": imageRequest.mimeType,
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
