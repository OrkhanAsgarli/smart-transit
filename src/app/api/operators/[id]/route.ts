
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { checkLocalAdmin } from "@/lib/local-admin";
import { parseOperator } from "../route";

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

  try {
    const result = parseOperator(await request.json());

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const operator = await prisma.transitOperator.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json({ success: true, operator });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Operator tapılmadı." },
          { status: 404 }
        );
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Bu kod başqa operatora məxsusdur." },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Redaktə mümkün olmadı." },
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
    const operator = await prisma.transitOperator.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            routes: true,
            buses: true,
            users: true,
          },
        },
      },
    });

    if (!operator) {
      return NextResponse.json(
        { error: "Operator tapılmadı." },
        { status: 404 }
      );
    }

    if (
      operator._count.routes > 0 ||
      operator._count.buses > 0 ||
      operator._count.users > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Operatora bağlı marşrutlar, avtobuslar və ya istifadəçilər var. Əvvəl əlaqələri ayırın.",
        },
        { status: 409 }
      );
    }

    await prisma.transitOperator.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Operator silinə bilmədi." },
      { status: 500 }
    );
  }
}
