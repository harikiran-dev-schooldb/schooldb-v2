import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function healthResponse(body: object, status: number, databaseMs: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Server-Timing": `database;dur=${databaseMs}`,
    },
  });
}

export async function GET() {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const databaseMs = Math.round((performance.now() - startedAt) * 10) / 10;

    return healthResponse(
      {
        status: "healthy",
        checks: { database: "up" },
        databaseMs,
        timestamp: new Date().toISOString(),
      },
      200,
      databaseMs,
    );
  } catch (error) {
    const databaseMs = Math.round((performance.now() - startedAt) * 10) / 10;
    console.error(
      JSON.stringify({
        level: "error",
        event: "health_check_failed",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown database error",
      }),
    );

    return healthResponse(
      {
        status: "degraded",
        checks: { database: "down" },
        databaseMs,
        timestamp: new Date().toISOString(),
      },
      503,
      databaseMs,
    );
  }
}
