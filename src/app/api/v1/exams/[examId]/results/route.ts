import { NextRequest, NextResponse } from "next/server";

import { requireTenant } from "@/lib/auth";

import { examResultService } from "@/features/exams/services/exam-result.service";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      examId: string;
    }>;
  },
) {
  try {
    const { examId } = await params;

    const classId =
      request.nextUrl.searchParams.get("classId");

    const sectionId =
      request.nextUrl.searchParams.get("sectionId");

    const tenant = await requireTenant();

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const data =
      await examResultService.getResults({
        examId,
        schoolId: tenant.schoolId,
        classId,
        sectionId,
      });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Failed to load exam results:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load exam results.",
      },
      {
        status:
          error instanceof Error &&
          error.message === "Exam not found."
            ? 404
            : 500,
      },
    );
  }
}