
export type OccupancyObservation = {
  userId: string;
  type: string;
  createdAt: Date;
};

export type AnomalyResult = {
  detected: boolean;
  reason: string;
  evidence: {
    total: number;
    high: number;
    highPercent: number;
    distinctUsers: number;
    spanMinutes: number;
    maxGapMinutes: number;
  };
};

export function detectSustainedCrowding(
  observations: OccupancyObservation[],
  now = new Date()
): AnomalyResult {
  const MINUTE = 60_000;
  const windowStart = now.getTime() - 12 * MINUTE;

  const validTypes = new Set([
    "BUS_EMPTY",
    "BUS_MODERATE",
    "BUS_CROWDED",
  ]);

  const reports = observations
    .filter((item) => {
      const time = item.createdAt.getTime();

      return (
        Number.isFinite(time) &&
        time >= windowStart &&
        time <= now.getTime() &&
        validTypes.has(item.type) &&
        Boolean(item.userId)
      );
    })
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime()
    );

  const total = reports.length;
  const high = reports.filter(
    (item) => item.type === "BUS_CROWDED"
  ).length;

  const distinctUsers = new Set(
    reports.map((item) => item.userId)
  ).size;

  const highPercent =
    total > 0 ? (high / total) * 100 : 0;

  const firstTime = reports[0]?.createdAt.getTime();
  const lastTime = reports[total - 1]?.createdAt.getTime();

  const spanMinutes =
    firstTime !== undefined && lastTime !== undefined
      ? (lastTime - firstTime) / MINUTE
      : 0;

  let maxGapMinutes = 0;

  for (let i = 1; i < reports.length; i++) {
    const gap =
      (reports[i].createdAt.getTime() -
        reports[i - 1].createdAt.getTime()) /
      MINUTE;

    maxGapMinutes = Math.max(maxGapMinutes, gap);
  }

  const recent =
    lastTime !== undefined &&
    now.getTime() - lastTime <= 2 * MINUTE;

  const detected =
    total >= 4 &&
    high >= 3 &&
    distinctUsers >= 2 &&
    highPercent >= 75 &&
    spanMinutes >= 10 &&
    maxGapMinutes <= 5 &&
    recent;

  let reason = "Yetərli anomaliya sübutu yoxdur.";

  if (detected) {
    reason =
      `Avtobus üzrə ${spanMinutes.toFixed(1)} dəqiqə ` +
      `ərzində ${total} müşahidənin ${high}-i HIGH ` +
      `(${highPercent.toFixed(0)}%). ` +
      `${distinctUsers} fərqli istifadəçi. ` +
      "Ehtiyat avtobus göndərilməsi tövsiyə olunur.";
  }

  return {
    detected,
    reason,
    evidence: {
      total,
      high,
      highPercent: Math.round(highPercent),
      distinctUsers,
      spanMinutes: Number(spanMinutes.toFixed(1)),
      maxGapMinutes: Number(maxGapMinutes.toFixed(1)),
    },
  };
}
