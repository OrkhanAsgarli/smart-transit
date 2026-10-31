
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [buses, positions] = await Promise.all([
      prisma.bus.findMany({
        orderBy: { fleetCode: "asc" },
      }),
      prisma.busPosition.findMany({
        orderBy: { recordedAt: "desc" },
        take: 1000,
      }),
    ]);

    const latest = new Map<
      string,
      (typeof positions)[number]
    >();

    for (const position of positions) {
      if (!latest.has(position.busId)) {
        latest.set(position.busId, position);
      }
    }

    const result = buses.map((bus) => {
      const position = latest.get(bus.id);
      const ageSeconds = position
        ? Math.floor(
            (Date.now() - position.recordedAt.getTime()) / 1000
          )
        : null;

      return {
        id: bus.id,
        fleetCode: bus.fleetCode,
        plateNumber: bus.plateNumber,
        capacity: bus.capacity,
        status: bus.status,
        operatorId: bus.operatorId,
        routeId: bus.routeId,
        directionId: bus.directionId,
        position: position
          ? {
              latitude: position.latitude,
              longitude: position.longitude,
              speedKmh: position.speedKmh,
              heading: position.heading,
              source: position.source,
              recordedAt: position.recordedAt,
              ageSeconds,
              isFresh: ageSeconds !== null && ageSeconds <= 60,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      buses: result,
      total: result.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("LIVE BUSES ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Avtobus məlumatları alınmadı." },
      { status: 500 }
    );
  }
}
