
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  detectSustainedCrowding,
  type OccupancyObservation,
} from "@/lib/transit-anomaly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const demo =
      request.nextUrl.searchParams.get("demo") === "true";

    if (demo) {
      if (
        process.env.ENABLE_DEMO_CROWD_REPORTS !== "true"
      ) {
        return NextResponse.json(
          { success: false, error: "Demo deaktivdir." },
          { status: 403 }
        );
      }

      const now = new Date();

      // Tamamilə sintetik məlumat.
      // PostgreSQL-ə yazılmır.
      const minutesAgo = (
        minutes: number,
        userId: string,
        type: string
      ): OccupancyObservation => ({
        userId,
        type,
        createdAt: new Date(
          now.getTime() - minutes * 60_000
        ),
      });

      const sustainedHigh = [
        minutesAgo(11, "demo-user-a", "BUS_CROWDED"),
        minutesAgo(8, "demo-user-b", "BUS_CROWDED"),
        minutesAgo(5, "demo-user-a", "BUS_CROWDED"),
        minutesAgo(2, "demo-user-b", "BUS_MODERATE"),
        minutesAgo(0, "demo-user-a", "BUS_CROWDED"),
      ];

      const insufficient = [
        minutesAgo(1, "demo-user-a", "BUS_CROWDED"),
      ];

      return NextResponse.json({
        success: true,
        mode: "SYNTHETIC_DEMO",
        persisted: false,
        explanation:
          "Bu yalnız anomaliya qaydasının nümayişidir. " +
          "Həqiqi sərnişin məlumatı və real dispatch deyil.",
        scenarios: {
          sustainedHigh: detectSustainedCrowding(
            sustainedHigh,
            now
          ),
          insufficient: detectSustainedCrowding(
            insufficient,
            now
          ),
        },
      });
    }

    const actions = await prisma.dispatchAction.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60_000),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
      select: {
        id: true,
        status: true,
        reason: true,
        notes: true,
        routeId: true,
        busId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      mode: "DATABASE",
      total: actions.length,
      actions,
    });
  } catch (error) {
    console.error("ANOMALIES GET:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Anomaliya məlumatları alınmadı.",
      },
      { status: 500 }
    );
  }
}
