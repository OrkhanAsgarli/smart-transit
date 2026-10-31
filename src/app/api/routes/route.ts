
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { checkLocalAdmin } from "@/lib/local-admin";
import { parseRouteInput, toGeometry } from "@/lib/route-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const includeRelations = {
  operator: {
    select: { id: true, name: true, code: true },
  },
  directions: {
    orderBy: { type: "asc" as const },
  },
  _count: {
    select: { buses: true },
  },
};

export async function GET() {
  try {
    const routes = await prisma.route.findMany({
      include: includeRelations,
      orderBy: [{ number: "asc" }],
    });

    return NextResponse.json({ success: true, routes });
  } catch (error) {
    console.error("Routes GET:", error);

    return NextResponse.json(
      { error: "Marşrutlar yüklənmədi." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = checkLocalAdmin(request);
  if (denied) return denied;

  try {
    const input = parseRouteInput(await request.json());

    const operator = await prisma.transitOperator.findUnique({
      where: { id: input.operatorId },
      select: { id: true },
    });

    if (!operator) {
      return NextResponse.json(
        { error: "Operator tapılmadı." },
        { status: 404 }
      );
    }

    const route = await prisma.route.create({
      data: {
        number: input.number,
        name: input.name,
        isActive: input.isActive,
        operator: {
          connect: { id: input.operatorId },
        },
        directions: {
          create: input.directions.map((direction) => ({
            type: direction.type,
            originName: direction.originName,
            destinationName: direction.destinationName,
            geometry: toGeometry(direction.points),
          })),
        },
      },
      include: includeRelations,
    });

    return NextResponse.json(
      { success: true, route },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && !(error instanceof Prisma.PrismaClientKnownRequestError)) {
      if (error.message !== "Unexpected end of JSON input") {
        if (
          error.message.includes("Marşrut") ||
          error.message.includes("İstiqamət") ||
          error.message.includes("operator") ||
          error.message.includes("Xəritə") ||
          error.message.includes("koordinat") ||
          error.message.includes("Gediş") ||
          error.message.includes("Düzgün") ||
          error.message.includes("Məlumat")
        ) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Bu operator üçün marşrut nömrəsi artıq mövcuddur." },
        { status: 409 }
      );
    }

    console.error("Routes POST:", error);
    return NextResponse.json(
      { error: "Marşrut yaradıla bilmədi." },
      { status: 500 }
    );
  }
}
