
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { checkLocalAdmin } from "@/lib/local-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const buses = await prisma.bus.findMany({
      orderBy: { fleetCode: "asc" },
      include: {
        operator: {
          select: { id: true, name: true },
        },
        route: {
          select: { id: true, number: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      buses,
      total: buses.length,
    });
  } catch (error) {
    console.error("BUS GET:", error);

    return NextResponse.json(
      { error: "Avtobuslar yüklənmədi." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = checkLocalAdmin(request);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Yanlış məlumat formatı." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const fleetCode =
      typeof data.fleetCode === "string"
        ? data.fleetCode.trim().toUpperCase()
        : "";

    const plateNumber =
      typeof data.plateNumber === "string"
        ? data.plateNumber.trim().toUpperCase()
        : "";

    const operatorId =
      typeof data.operatorId === "string"
        ? data.operatorId.trim()
        : "";

    const routeId =
      typeof data.routeId === "string"
        ? data.routeId.trim()
        : "";

    const capacity = data.capacity;

    if (!/^[A-Z0-9_-]{2,30}$/.test(fleetCode)) {
      return NextResponse.json(
        { error: "Avtobus kodu 2–30 simvol olmalıdır." },
        { status: 400 }
      );
    }

    if (plateNumber.length < 3 || plateNumber.length > 30) {
      return NextResponse.json(
        { error: "Düzgün qeydiyyat nişanı daxil et." },
        { status: 400 }
      );
    }

    if (
      typeof capacity !== "number" ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 300
    ) {
      return NextResponse.json(
        { error: "Tutum 1–300 arasında olmalıdır." },
        { status: 400 }
      );
    }

    if (!operatorId || !routeId) {
      return NextResponse.json(
        { error: "Operator və marşrut tələb olunur." },
        { status: 400 }
      );
    }

    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: {
        id: true,
        operatorId: true,
        directions: {
          where: { type: "OUTBOUND" },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!route || route.operatorId !== operatorId) {
      return NextResponse.json(
        { error: "Marşrut seçilmiş operatora aid deyil." },
        { status: 400 }
      );
    }

    if (!route.directions.length) {
      return NextResponse.json(
        { error: "Marşrutun gediş istiqaməti yoxdur." },
        { status: 400 }
      );
    }

    const bus = await prisma.bus.create({
      data: {
        fleetCode,
        plateNumber,
        capacity,
        operatorId,
        routeId,
        directionId: route.directions[0].id,
      },
    });

    return NextResponse.json(
      { success: true, bus },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Bu avtobus kodu və ya nömrə artıq mövcuddur." },
        { status: 409 }
      );
    }

    console.error("BUS POST:", error);

    return NextResponse.json(
      { error: "Avtobus əlavə edilmədi." },
      { status: 500 }
    );
  }
}
