
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Aktiv marşrutları və istiqamətləri götürürük.
    const routes = await prisma.route.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        number: true,
        name: true,
        operator: {
          select: {
            name: true,
          },
        },
        directions: {
          select: {
            id: true,
            type: true,
            originName: true,
            destinationName: true,
          },
        },
      },
      orderBy: {
        number: "asc",
      },
    });

    // 2. Marşrut istiqamətlərinin ID-lərini toplayırıq.
    const directionIds = routes.flatMap((route) =>
      route.directions.map((direction) => direction.id)
    );

    // 3. Dayanacaqları əlaqə cədvəlindən ayrıca oxuyuruq.
    const routeStops = await prisma.routeStop.findMany({
      where: {
        directionId: {
          in: directionIds,
        },
      },
      select: {
        directionId: true,
        sequence: true,
        stop: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: [
        { directionId: "asc" },
        { sequence: "asc" },
      ],
    });

    // 4. Dayanacaqları istiqamət ID-sinə görə qruplaşdırırıq.
    type StopItem = {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      sequence: number;
    };

    const stopsByDirection = new Map<string, StopItem[]>();

    for (const item of routeStops) {
      const stops = stopsByDirection.get(item.directionId) ?? [];

      stops.push({
        id: item.stop.id,
        name: item.stop.name,
        latitude: item.stop.latitude,
        longitude: item.stop.longitude,
        sequence: item.sequence,
      });

      stopsByDirection.set(item.directionId, stops);
    }

    // 5. Frontend üçün hazır nəticə yaradırıq.
    const result = routes.map((route) => ({
      id: route.id,
      number: route.number,
      name: route.name,
      operator: route.operator,
      directions: route.directions.map((direction) => ({
        id: direction.id,
        type: direction.type,
        originName: direction.originName,
        destinationName: direction.destinationName,
        stops: stopsByDirection.get(direction.id) ?? [],
      })),
    }));

    return NextResponse.json({
      success: true,
      routes: result,
    });
  } catch (error) {
    console.error("PASSENGER ROUTES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Marşrut və dayanacaqlar yüklənmədi.",
      },
      { status: 500 }
    );
  }
}
