
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLocalAdmin } from "@/lib/local-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Point = [number, number];

function parseGeometry(value: unknown): Point[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const geometry = value as {
    type?: unknown;
    coordinates?: unknown;
  };

  if (
    geometry.type !== "LineString" ||
    !Array.isArray(geometry.coordinates)
  ) {
    return [];
  }

  return geometry.coordinates.flatMap((point): Point[] => {
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      typeof point[0] !== "number" ||
      typeof point[1] !== "number" ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    ) {
      return [];
    }

    // GeoJSON: [longitude, latitude]
    return [[point[1], point[0]]];
  });
}

function interpolate(
  a: Point,
  b: Point,
  progress: number
): Point {
  return [
    a[0] + (b[0] - a[0]) * progress,
    a[1] + (b[1] - a[1]) * progress,
  ];
}

function headingDegrees(a: Point, b: Point): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export async function POST(request: NextRequest) {
  const denied = checkLocalAdmin(request);
  if (denied) return denied;

  try {
    const buses = await prisma.bus.findMany({
      where: {
        routeId: { not: null },
        directionId: { not: null },
      },
      orderBy: { fleetCode: "asc" },
      select: {
        id: true,
        fleetCode: true,
        directionId: true,
      },
    });

    const simulated: Array<{
      busId: string;
      fleetCode: string;
      latitude: number;
      longitude: number;
    }> = [];

    const skipped: string[] = [];

    for (const bus of buses) {
      const direction = await prisma.routeDirection.findUnique({
        where: { id: bus.directionId! },
        select: { geometry: true },
      });

      const points = parseGeometry(direction?.geometry);

      if (points.length < 2) {
        skipped.push(bus.fleetCode);
        continue;
      }

      // Hər iki marşrut nöqtəsi arasında 10 kiçik addım.
      const stepsPerSegment = 10;
      const totalSteps = (points.length - 1) * stepsPerSegment;

      const previousTicks = await prisma.busPosition.count({
        where: {
          busId: bus.id,
          source: "SIMULATION",
        },
      });

      const step = previousTicks % totalSteps;
      const segment = Math.floor(step / stepsPerSegment);
      const progress = (step % stepsPerSegment) / stepsPerSegment;

      const a = points[segment];
      const b = points[segment + 1];

      const [latitude, longitude] = interpolate(a, b, progress);

      await prisma.busPosition.create({
        data: {
          busId: bus.id,
          latitude,
          longitude,
          speedKmh: 18,
          heading: headingDegrees(a, b),
          source: "SIMULATION",
          recordedAt: new Date(),
        },
      });

      simulated.push({
        busId: bus.id,
        fleetCode: bus.fleetCode,
        latitude,
        longitude,
      });
    }

    return NextResponse.json({
      success: true,
      simulated,
      skipped,
      total: simulated.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SIMULATION ERROR:", error);

    return NextResponse.json(
      { error: "GPS simulyasiyası icra edilmədi." },
      { status: 500 }
    );
  }
}
