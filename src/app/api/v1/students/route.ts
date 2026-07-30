import { NextResponse } from "next/server";
import { studentService } from "@/features/students/services/student.service";

export async function GET() {
  try {
    const students = await studentService.getAll();

    return NextResponse.json(
      {
        success: true,
        data: students,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/v1/students", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch students.",
      },
      { status: 500 }
    );
  }
}