
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { checkLocalAdmin } from "@/lib/local-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseOperator(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Yanlış məlumat formatı." };
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.name !== "string" ||
    typeof data.code !== "string" ||
    (data.website != null && typeof data.website !== "string")
  ) {
    return { error: "Düzgün məlumat daxil edin." };
  }

  const name = data.name.trim();
  const code = data.code.trim().toUpperCase();
  const website = (data.website ?? "").toString().trim();

  if (name.length < 2 || name.length > 120) {
    return { error: "Operator adı 2–120 simvol olmalıdır." };
  }

  if (!/^[A-Z0-9_-]{2,30}$/.test(code)) {
    return { error: "Kod 2–30 simvol və yalnız hərf, rəqəm, _ və - ola bilər." };
  }

  if (website) {
    try {
      const url = new URL(website);
      if (!["https:", "http:"].includes(url.protocol) || website.length > 500) {
        return { error: "Düzgün HTTP/HTTPS ünvanı daxil edin." };
      }
    } catch {
      return { error: "Veb sayt ünvanı düzgün deyil." };
    }
  }

  return { data: { name, code, website: website || null } };
}

export { parseOperator };

export async function GET() {
  try {
    const operators = await prisma.transitOperator.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { routes: true, buses: true, users: true },
        },
      },
    });

    return NextResponse.json({ success: true, operators });
  } catch {
    return NextResponse.json(
      { error: "Operatorlar yüklənmədi." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = checkLocalAdmin(request);
  if (denied) return denied;

  try {
    const result = parseOperator(await request.json());
    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const operator = await prisma.transitOperator.create({
      data: result.data,
    });

    return NextResponse.json(
      { success: true, operator },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Bu operator kodu artıq mövcuddur." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Operator yaradıla bilmədi." },
      { status: 500 }
    );
  }
}
