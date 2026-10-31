
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { checkLocalAdmin } from "@/lib/local-admin";
import { parseRouteInput, toGeometry } from "@/lib/route-input";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: Context
) {
  const denied = checkLocalAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;

  let input: ReturnType<typeof parseRouteInput>;

  try {
    input = parseRouteInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Yanlış məlumat." },
      { status: 400 }
    );
  }

  try {
    const route = await prisma.$transaction(async (tx) => {
      const existing = await tx.route.findUnique({
        where: { id },
        include: {
          _count: { select: { buses: true } },
        },
      });

      if (!existing) throw new Error("NOT_FOUND");

      if (
        existing.operatorId !== input.operatorId &&
        existing._count.buses > 0
      ) {
        throw new Error("OPERATOR_HAS_BUSES");
      }

      await tx.route.update({
        where: { id },
        data: {
          number: input.number,
          name: input.name,
          isActive: input.isActive,
          operatorId: input.operatorId,
        },
      });

      for (const direction of input.directions) {
        await tx.routeDirection.upsert({
          where: {
            routeId_type: {
              routeId: id,
              type: direction.type,
            },
          },
          create: {
            routeId: id,
            type: direction.type,
            originName: direction.originName,
            destinationName: direction.destinationName,
            geometry: toGeometry(direction.points),
          },
          update: {
            originName: direction.originName,
            destinationName: direction.destinationName,
            geometry: toGeometry(direction.points),
          },
        });
      }

      return tx.route.findUniqueOrThrow({
        where: { id },
        include: {
          operator: {
            select: { id: true, name: true, code: true },
          },
          directions: true,
          _count: { select: { buses: true } },
        },
      });
    });

    return NextResponse.json({ success: true, route });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Marşrut tapılmadı." },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "OPERATOR_HAS_BUSES"
    ) {
      return NextResponse.json(
        { error: "Avtobuslar təyin edildiyi üçün operatoru dəyişmək olmaz." },
        { status: 409 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Bu marşrut nömrəsi artıq mövcuddur." },
        { status: 409 }
      );
    }

    console.error("Route PATCH:", error);

    return NextResponse.json(
      { error: "Marşrut yenilənmədi." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  const denied = checkLocalAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;

  try {
    await prisma.$transaction(async (tx) => {
      const route = await tx.route.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              buses: true,
              reports: true,
              dispatches: true,
            },
          },
        },
      });

      if (!route) throw new Error("NOT_FOUND");

      const count = route._count;

      if (count.buses || count.reports || count.dispatches) {
        throw new Error("HAS_DEPENDENCIES");
      }

      await tx.route.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Marşrut tapılmadı." },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "HAS_DEPENDENCIES"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu marşruta bağlı avtobuslar, sərnişin bildirişləri və ya dispetçer qərarları var. Əvvəl əlaqələri ayır.",
        },
        { status: 409 }
      );
    }

    console.error("Route DELETE:", error);

    return NextResponse.json(
      { error: "Marşrut silinə bilmədi." },
      { status: 500 }
    );
  }
}
