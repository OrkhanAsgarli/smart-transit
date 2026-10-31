
import { Prisma, DirectionType } from "@/generated/prisma/client";

export type Point = [number, number];

export type DirectionInput = {
  type: DirectionType;
  originName: string;
  destinationName: string;
  points: Point[];
};

export type RouteInput = {
  operatorId: string;
  number: string;
  name: string | null;
  isActive: boolean;
  directions: DirectionInput[];
};

export function parseRouteInput(body: unknown): RouteInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Məlumat formatı yanlışdır.");
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.operatorId !== "string" ||
    typeof data.number !== "string" ||
    typeof data.isActive !== "boolean" ||
    (data.name != null && typeof data.name !== "string") ||
    !Array.isArray(data.directions)
  ) {
    throw new Error("Marşrut məlumatları tam deyil.");
  }

  const operatorId = data.operatorId.trim();
  const number = data.number.trim().toUpperCase();
  const name = typeof data.name === "string"
    ? data.name.trim()
    : "";

  if (!operatorId || !/^[\p{L}\p{N}-]{1,20}$/u.test(number)) {
    throw new Error("Düzgün operator və marşrut nömrəsi daxil et.");
  }

  if (name.length > 150) {
    throw new Error("Marşrut adı çox uzundur.");
  }

  if (data.directions.length !== 2) {
    throw new Error("Gediş və dönüş istiqamətləri tələb olunur.");
  }

  const directions: DirectionInput[] = data.directions.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("İstiqamət məlumatı düzgün deyil.");
    }

    const d = item as Record<string, unknown>;

    if (
      (d.type !== "OUTBOUND" && d.type !== "INBOUND") ||
      typeof d.originName !== "string" ||
      typeof d.destinationName !== "string" ||
      !Array.isArray(d.points)
    ) {
      throw new Error("İstiqamət məlumatı natamamdır.");
    }

    const originName = d.originName.trim();
    const destinationName = d.destinationName.trim();

    if (
      originName.length < 2 ||
      destinationName.length < 2 ||
      originName.length > 120 ||
      destinationName.length > 120
    ) {
      throw new Error("İstiqamət adları 2–120 simvol olmalıdır.");
    }

    if (d.points.length > 2000 || d.points.length === 1) {
      throw new Error("Xəritə xətti 0 və ya ən azı 2 nöqtədən ibarət olmalıdır.");
    }

    const points: Point[] = d.points.map((p) => {
      if (
        !Array.isArray(p) ||
        p.length !== 2 ||
        typeof p[0] !== "number" ||
        typeof p[1] !== "number" ||
        !Number.isFinite(p[0]) ||
        !Number.isFinite(p[1]) ||
        p[0] < -90 || p[0] > 90 ||
        p[1] < -180 || p[1] > 180
      ) {
        throw new Error("Xəritə koordinatları düzgün deyil.");
      }

      return [p[0], p[1]];
    });

    return {
      type: d.type as DirectionType,
      originName,
      destinationName,
      points,
    };
  });

  if (
    directions.filter((d) => d.type === "OUTBOUND").length !== 1 ||
    directions.filter((d) => d.type === "INBOUND").length !== 1
  ) {
    throw new Error("Bir gediş və bir dönüş istiqaməti olmalıdır.");
  }

  return {
    operatorId,
    number,
    name: name || null,
    isActive: data.isActive,
    directions,
  };
}

export function toGeometry(
  points: Point[]
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (points.length === 0) return Prisma.DbNull;

  return {
    type: "LineString",
    coordinates: points.map(([lat, lng]) => [lng, lat]),
  };
}
