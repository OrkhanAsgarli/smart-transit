
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateBusCrowding } from "@/lib/dispatch-anomaly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_USER_ID = "smarttransit-demo-passenger";

const LEVEL_TO_TYPE = {
  LOW: "BUS_EMPTY",
  MEDIUM: "BUS_MODERATE",
  HIGH: "BUS_CROWDED",
} as const;

type OccupancyLevel = keyof typeof LEVEL_TO_TYPE;

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// ---------------------------------------------------------
// POST — Sərnişin sıxlıq bildirişi göndərir
// ---------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Yalnız lokal demo rejimində işləyir.
    if (process.env.ENABLE_DEMO_CROWD_REPORTS !== "true") {
      return errorResponse(
        "Demo bildiriş rejimi deaktivdir.",
        403
      );
    }

    // 1. JSON məlumatlarını oxuyuruq.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Düzgün JSON göndərin.", 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse("Yanlış sorğu formatı.", 400);
    }

    const data = body as Record<string, unknown>;

    const busId = data.busId;
    const stopId = data.stopId;
    const level = data.level;

    // 2. Avtobus ID-si yoxlanılır.
    if (
      typeof busId !== "string" ||
      !busId.trim() ||
      busId.length > 128
    ) {
      return errorResponse("Yanlış avtobus ID-si.", 400);
    }

    // 3. Sıxlıq səviyyəsi yoxlanılır.
    if (
      typeof level !== "string" ||
      !Object.prototype.hasOwnProperty.call(
        LEVEL_TO_TYPE,
        level
      )
    ) {
      return errorResponse(
        "Sıxlıq yalnız LOW, MEDIUM və ya HIGH ola bilər.",
        400
      );
    }

    // 4. Dayanacaq ID-si yoxlanılır.
    if (
      stopId !== null &&
      stopId !== undefined &&
      (
        typeof stopId !== "string" ||
        !stopId.trim() ||
        stopId.length > 128
      )
    ) {
      return errorResponse("Yanlış dayanacaq ID-si.", 400);
    }

    const typedLevel = level as OccupancyLevel;

    // 5. Avtobusun mövcudluğu yoxlanılır.
    const bus = await prisma.bus.findUnique({
      where: {
        id: busId.trim(),
      },
      select: {
        id: true,
        fleetCode: true,
        routeId: true,
        directionId: true,
      },
    });

    if (!bus) {
      return errorResponse("Avtobus tapılmadı.", 404);
    }

    if (!bus.routeId || !bus.directionId) {
      return errorResponse(
        "Avtobus aktiv marşrut və istiqamətə bağlı deyil.",
        400
      );
    }

    // 6. Seçilmiş dayanacağın avtobus istiqamətinə
    // aid olduğunu yoxlayırıq.
    const normalizedStopId =
      typeof stopId === "string"
        ? stopId.trim()
        : null;

    if (normalizedStopId) {
      const routeStop = await prisma.routeStop.findFirst({
        where: {
          directionId: bus.directionId,
          stopId: normalizedStopId,
        },
        select: {
          id: true,
        },
      });

      if (!routeStop) {
        return errorResponse(
          "Seçilmiş dayanacaq avtobusun istiqamətinə aid deyil.",
          400
        );
      }
    }

    // 7. Demo istifadəçisinin mövcudluğunu yoxlayırıq.
    const demoUser = await prisma.user.findUnique({
      where: {
        id: DEMO_USER_ID,
      },
      select: {
        id: true,
      },
    });

    if (!demoUser) {
      return errorResponse(
        "Demo sərnişin hesabı tapılmadı.",
        503
      );
    }

    // 8. Spam məhdudiyyəti:
    // Eyni demo istifadəçi eyni avtobus üçün
    // 60 saniyədə yalnız bir bildiriş göndərə bilər.
    const cooldownStart = new Date(
      Date.now() - 60 * 1000
    );

    const previousReport =
      await prisma.crowdReport.findFirst({
        where: {
          userId: DEMO_USER_ID,
          busId: bus.id,
          createdAt: {
            gte: cooldownStart,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

    if (previousReport) {
      const elapsed =
        Date.now() -
        previousReport.createdAt.getTime();

      const remainingSeconds = Math.max(
        1,
        Math.ceil((60_000 - elapsed) / 1000)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Bu avtobus üçün yeni bildiriş göndərmək " +
            `üçün ${remainingSeconds} saniyə gözləyin.`,
          retryAfterSeconds: remainingSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(remainingSeconds),
          },
        }
      );
    }

    // 9. Sıxlıq bildirişini PostgreSQL-də saxlayırıq.
    const report = await prisma.crowdReport.create({
      data: {
        type: LEVEL_TO_TYPE[typedLevel],
        status: "PENDING",
        confidence: 0.5,
        userId: DEMO_USER_ID,
        routeId: bus.routeId,
        busId: bus.id,
        stopId: normalizedStopId,
      },
      select: {
        id: true,
        type: true,
        status: true,
        confidence: true,
        routeId: true,
        busId: true,
        stopId: true,
        createdAt: true,
      },
    });

    // 10. Bildiriş saxlandıqdan sonra avtomatik
    // anomaliya aşkarlanmasını işə salırıq.
    //
    // Anomaliya yoxlaması uğursuz olsa belə,
    // artıq yaradılmış report silinmir.
    let anomaly:
      | Awaited<ReturnType<typeof evaluateBusCrowding>>
      | null = null;

    let anomalyCheckSucceeded = false;

    try {
      anomaly = await evaluateBusCrowding(bus.id);
      anomalyCheckSucceeded = true;
    } catch (anomalyError) {
      console.error(
        "ANOMALY EVALUATION ERROR:",
        anomalyError
      );
    }

    // 11. Uğurlu cavab.
    return NextResponse.json(
      {
        success: true,
        message: "Sıxlıq bildirişi uğurla qeydə alındı.",

        report,

        occupancy: {
          level: typedLevel,
          type: report.type,
          verified: report.status === "VERIFIED",
        },

        bus: {
          id: bus.id,
          fleetCode: bus.fleetCode,
          routeId: bus.routeId,
          directionId: bus.directionId,
        },

      
anomaly: {
  checked: anomalyCheckSucceeded,
  detected: anomaly?.detected ?? false,
  recommendationCreated: anomaly?.created ?? false,

  actionId:
    anomaly && "actionId" in anomaly
      ? anomaly.actionId
      : null,

  reason: anomaly?.reason ?? null,

  evidence:
    anomaly && "evidence" in anomaly
      ? anomaly.evidence
      : null,
},

      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CROWD REPORT POST ERROR:", error);

    return errorResponse(
      "Sıxlıq bildirişi saxlanılarkən xəta baş verdi.",
      500
    );
  }
}

// ---------------------------------------------------------
// GET — Demo sərnişinin son bildirişləri
// ---------------------------------------------------------

export async function GET() {
  try {
    if (process.env.ENABLE_DEMO_CROWD_REPORTS !== "true") {
      return errorResponse(
        "Demo bildiriş rejimi deaktivdir.",
        403
      );
    }

    const reports = await prisma.crowdReport.findMany({
      where: {
        userId: DEMO_USER_ID,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
      select: {
        id: true,
        type: true,
        status: true,
        confidence: true,
        busId: true,
        routeId: true,
        stopId: true,
        createdAt: true,
      },
    });

    const summary = {
      low: reports.filter(
        (report) => report.type === "BUS_EMPTY"
      ).length,

      medium: reports.filter(
        (report) => report.type === "BUS_MODERATE"
      ).length,

      high: reports.filter(
        (report) => report.type === "BUS_CROWDED"
      ).length,
    };

    return NextResponse.json({
      success: true,
      total: reports.length,
      summary,
      reports,
    });
  } catch (error) {
    console.error("CROWD REPORT GET ERROR:", error);

    return errorResponse(
      "Sərnişin bildirişləri yüklənmədi.",
      500
    );
  }
}
