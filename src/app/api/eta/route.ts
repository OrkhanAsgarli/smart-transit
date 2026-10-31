
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  distanceKm,
  estimateEtaMinutes,
} from "@/lib/transit-geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const busId = request.nextUrl.searchParams.get("busId");
    const stopId = request.nextUrl.searchParams.get("stopId");

    if (!busId || !stopId) {
      return NextResponse.json(
        { error: "busId və stopId tələb olunur." },
        { status: 400 }
      );
    }

    const [bus, stop, position] = await Promise.all([
      prisma.bus.findUnique({ where: { id: busId } }),
      prisma.stop.findUnique({ where: { id: stopId } }),
      prisma.busPosition.findFirst({
        where: { busId },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    if (!bus || !stop) {
      return NextResponse.json(
        { error: "Avtobus və ya dayanacaq tapılmadı." },
        { status: 404 }
      );
    }

    if (!position) {
      return NextResponse.json(
        {
          success: true,
          available: false,
          reason: "Avtobusun GPS mövqeyi yoxdur.",
        }
      );
    }

    const ageSeconds = Math.max(
      0,
      Math.floor(
        (Date.now() - position.recordedAt.getTime()) / 1000
      )
    );

    if (ageSeconds > 60) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: "Avtobus mövqeyi köhnədir.",
        lastSeenAt: position.recordedAt,
      });
    }

    // Bu, yol üzrə real ETA deyil.
    // Düz xətt məsafəsinə əsaslanan MVP təxminidir.
    const distance = distanceKm(
      {
        latitude: position.latitude,
        longitude: position.longitude,
      },
      {
        latitude: stop.latitude,
        longitude: stop.longitude,
      }
    );

    const speed =
      position.speedKmh && position.speedKmh > 5
        ? position.speedKmh
        : 18;

    return NextResponse.json({
      success: true,
      available: true,
      busId,
      stopId,
      stopName: stop.name,
      distanceKm: Number(distance.toFixed(2)),
      etaMinutes: estimateEtaMinutes(distance, speed),
      method: "straight_line_estimate",
      source: position.source,
      lastPositionAt: position.recordedAt,
      warning:
        "İlkin təxmindir; marşrut istiqaməti, yol şəbəkəsi və trafik nəzərə alınmır.",
    });
  } catch (error) {
    console.error("ETA ERROR:", error);

    return NextResponse.json(
      { error: "ETA hesablana bilmədi." },
      { status: 500 }
    );
  }
}
