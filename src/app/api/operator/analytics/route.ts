
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const since = new Date(Date.now() - 30 * 60 * 1000);

    const [routes, reports] = await Promise.all([
      prisma.route.findMany({
        where: { isActive: true },
        select: {
          id: true,
          number: true,
          name: true,
          directions: {
            select: {
              id: true,
              type: true,
              originName: true,
              destinationName: true,
            },
          },
        },
        orderBy: { number: "asc" },
      }),

      prisma.crowdReport.findMany({
        where: {
          createdAt: { gte: since },
          type: {
            in: [
              "BUS_EMPTY",
              "BUS_MODERATE",
              "BUS_CROWDED",
            ],
          },
          status: { not: "REJECTED" },
        },
        select: {
          id: true,
          type: true,
          status: true,
          routeId: true,
          busId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const result = routes.map((route) => {
      const routeReports = reports.filter(
        (report) => report.routeId === route.id
      );

      const low = routeReports.filter(
        (report) => report.type === "BUS_EMPTY"
      ).length;

      const medium = routeReports.filter(
        (report) => report.type === "BUS_MODERATE"
      ).length;

      const high = routeReports.filter(
        (report) => report.type === "BUS_CROWDED"
      ).length;

      const total = low + medium + high;

      return {
        id: route.id,
        number: route.number,
        name: route.name,
        directions: route.directions,
        counts: {
          low,
          medium,
          high,
          total,
        },
        highPercent:
          total > 0 ? Math.round((high / total) * 100) : 0,
        verifiedCount: routeReports.filter(
          (report) => report.status === "VERIFIED"
        ).length,
        latestReportAt:
          routeReports[0]?.createdAt ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      windowMinutes: 30,
      generatedAt: new Date().toISOString(),
      summary: {
        totalReports: reports.length,
        highReports: reports.filter(
          (report) => report.type === "BUS_CROWDED"
        ).length,
        activeRoutes: result.length,
      },
      routes: result,
    });
  } catch (error) {
    console.error("OPERATOR ANALYTICS:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Operator analitikası yüklənmədi.",
      },
      { status: 500 }
    );
  }
}
