
import { prisma } from "@/lib/prisma";
import { detectSustainedCrowding } from "./transit-anomaly";

const SYSTEM_USER_ID = "smarttransit-automation";

export async function evaluateBusCrowding(busId: string) {
  const now = new Date();

  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    select: {
      id: true,
      fleetCode: true,
      routeId: true,
    },
  });

  if (!bus?.routeId) {
    return {
      detected: false,
      created: false,
      reason: "Avtobus marşruta bağlı deyil.",
    };
  }

  const reports = await prisma.crowdReport.findMany({
    where: {
      busId,
      routeId: bus.routeId,
      createdAt: {
        gte: new Date(now.getTime() - 12 * 60_000),
        lte: now,
      },
      status: {
        not: "REJECTED",
      },
      type: {
        in: [
          "BUS_EMPTY",
          "BUS_MODERATE",
          "BUS_CROWDED",
        ],
      },
    },
    select: {
      userId: true,
      type: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const result = detectSustainedCrowding(reports, now);

  if (!result.detected) {
    return {
      ...result,
      created: false,
    };
  }

  // Serializasiya: eyni marşrut üçün iki paralel
  // sorğu iki tövsiyə yaratmasın.
  const action = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${"dispatch-anomaly:" + bus.routeId})
      )::text AS lock_result
    `;

    const existing = await tx.dispatchAction.findFirst({
      where: {
        routeId: bus.routeId!,
        status: {
          in: ["PROPOSED", "APPROVED"],
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return {
        id: existing.id,
        created: false,
      };
    }

    // Yalnız texniki atribusiya üçün sistem hesabı.
    // PASSENGER rolu dispetçer səlahiyyəti vermir.
    // Bu hesabın özü heç bir admin hüququ almır.
    await tx.user.upsert({
      where: {
        id: SYSTEM_USER_ID,
      },
      create: {
        id: SYSTEM_USER_ID,
        name: "Smart Transit Automation (system)",
        email: "automation@smarttransit.invalid",
        role: "PASSENGER",
      },
      update: {},
    });

    const created = await tx.dispatchAction.create({
      data: {
        status: "PROPOSED",
        reason: result.reason,
        notes:
          `Avtomatik tövsiyə. Bus: ${bus.fleetCode}. ` +
          `HIGH: ${result.evidence.high}/${result.evidence.total}. ` +
          `Müddət: ${result.evidence.spanMinutes} dəq. ` +
          `Mənbə: yoxlanmamış crowdsourced müşahidələr.`,
        routeId: bus.routeId!,
        busId: bus.id,
        dispatcherId: SYSTEM_USER_ID,
      },
      select: {
        id: true,
      },
    });

    return {
      id: created.id,
      created: true,
    };
  });

  return {
    ...result,
    created: action.created,
    actionId: action.id,
  };
}
