
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const [
      operators,
      routes,
      buses,
      stops,
    ] = await Promise.all([
      prisma.transitOperator.count(),
      prisma.route.count(),
      prisma.bus.count(),
      prisma.stop.count(),
    ]);

    return NextResponse.json({
      success: true,
      database: "connected",
      service: "Smart Transit API",
      counts: {
        operators,
        routes,
        buses,
        stops,
      },
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
