
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BusFront,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import type {
  Point,
  DisplayRoute,
} from "@/components/transit/RouteMap";

const RouteMap = dynamic(
  () => import("@/components/transit/RouteMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[480px] items-center justify-center bg-[#102033] text-cyan-300">
        Bakı xəritəsi yüklənir...
      </div>
    ),
  }
);

type Direction = "OUTBOUND" | "INBOUND";

type Operator = {
  id: string;
  name: string;
  code: string;
};

type RouteDirection = {
  id: string;
  type: Direction;
  originName: string;
  destinationName: string;
  geometry: unknown;
};

type TransitRoute = {
  id: string;
  number: string;
  name: string | null;
  isActive: boolean;
  operatorId: string;
  operator: Operator;
  directions: RouteDirection[];
  _count: {
    buses: number;
  };
};

const panelStyle =
  "rounded-2xl border border-white/[0.08] bg-[#101c31]";

const inputStyle =
  "w-full rounded-xl border border-white/10 bg-[#17263c] px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50";

function geometryToPoints(value: unknown): Point[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const geometry = value as {
    type?: unknown;
    coordinates?: unknown;
  };

  if (
    geometry.type !== "LineString" ||
    !Array.isArray(geometry.coordinates)
  ) {
    return [];
  }

  return geometry.coordinates.flatMap((point): Point[] => {
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      typeof point[0] !== "number" ||
      typeof point[1] !== "number"
    ) {
      return [];
    }

    return [[point[1], point[0]]];
  });
}

export default function RoutesPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [token, setToken] = useState("");

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [operatorsResponse, routesResponse] = await Promise.all([
        fetch("/api/operators", { cache: "no-store" }),
        fetch("/api/routes", { cache: "no-store" }),
      ]);

      const [operatorsData, routesData] = await Promise.all([
        operatorsResponse.json(),
        routesResponse.json(),
      ]);

      if (!operatorsResponse.ok || !routesResponse.ok) {
        throw new Error("Məlumatlar yüklənmədi.");
      }

      setOperators(operatorsData.operators ?? []);
      setRoutes(routesData.routes ?? []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bağlantı xətası."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const displayRoutes: DisplayRoute[] = useMemo(
    () =>
      routes.map((route) => ({
        id: route.id,
        number: route.number,
        outbound: geometryToPoints(
          route.directions.find(
            (direction) => direction.type === "OUTBOUND"
          )?.geometry
        ),
        inbound: geometryToPoints(
          route.directions.find(
            (direction) => direction.type === "INBOUND"
          )?.geometry
        ),
      })),
    [routes]
  );

  const selectedRoute = routes.find(
    (route) => route.id === selectedId
  );

  const filteredRoutes = routes.filter((route) =>
    `${route.number} ${route.name ?? ""} ${route.operator.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const mappedRoutes = displayRoutes.filter(
    (route) =>
      route.outbound.length >= 2 || route.inbound.length >= 2
  ).length;

  async function deleteRoute(route: TransitRoute) {
    if (!token.trim()) {
      setError("Əvvəl developer tokenini daxil et.");
      return;
    }

    if (
      !window.confirm(
        `${route.number} nömrəli marşrutu silmək istədiyinə əminsən?`
      )
    ) {
      return;
    }

    setDeletingId(route.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/routes/${encodeURIComponent(route.id)}`,
        {
          method: "DELETE",
          headers: {
            "x-admin-token": token,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Marşrut silinə bilmədi."
        );
      }

      if (selectedId === route.id) {
        setSelectedId("");
      }

      setMessage("Marşrut uğurla silindi.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Silinmə xətası."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#071120] px-4 py-7 text-white md:px-7">
      <div className="mx-auto max-w-[1650px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/operators"
              className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-400"
            >
              <ArrowLeft size={15} />
              Operator Management
            </Link>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-400">
                <RouteIcon size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-bold md:text-3xl">
                  Route Management
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Bakı · Marşrutlar və istiqamətlər
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/routes/new"
            aria-disabled={operators.length === 0}
            onClick={(event) => {
              if (operators.length === 0) event.preventDefault();
            }}
            className={`inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-[#071120] hover:bg-cyan-300 ${
              operators.length === 0
                ? "cursor-not-allowed opacity-40"
                : ""
            }`}
          >
            <Plus size={18} />
            Yeni marşrut
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              title: "Ümumi marşrutlar",
              value: routes.length,
              icon: RouteIcon,
            },
            {
              title: "Aktiv marşrutlar",
              value: routes.filter((route) => route.isActive).length,
              icon: CheckCircle2,
            },
            {
              title: "Xəritəsi olan",
              value: mappedRoutes,
              icon: MapPin,
            },
            {
              title: "Operatorlar",
              value: operators.length,
              icon: BusFront,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className={`${panelStyle} p-4 md:p-5`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">
                    {item.title}
                  </span>
                  <Icon size={18} className="text-cyan-400" />
                </div>

                <div className="mt-3 text-2xl font-bold">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>

        <section className={`${panelStyle} p-4`}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={17} className="text-cyan-400" />
            Lokal developer icazəsi
          </div>

          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="ADMIN_SETUP_TOKEN"
            className={inputStyle}
          />

          <p className="mt-2 text-xs text-slate-500">
            Bu token yalnız silmə əməliyyatı üçün istifadə olunur.
            Yeni marşrut və redaktə səhifələrində token ayrıca
            daxil edilir.
          </p>
        </section>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300"
          >
            {error}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className={`${panelStyle} overflow-hidden`}>
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Marşrut siyahısı</h2>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  title="Yenilə"
                  aria-label="Yenilə"
                  className="rounded-lg p-2 hover:bg-white/5"
                >
                  <RefreshCw
                    size={17}
                    className="text-slate-400"
                  />
                </button>
              </div>

              <div className="relative mt-4">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Marşrut axtar..."
                  className={`${inputStyle} pl-9`}
                />
              </div>
            </div>

            <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
              {loading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="animate-spin text-cyan-400" />
                </div>
              ) : filteredRoutes.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Hələ marşrut yoxdur.
                </div>
              ) : (
                filteredRoutes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => setSelectedId(route.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedId === route.id
                        ? "border-cyan-400/45 bg-cyan-400/10"
                        : "border-white/5 bg-white/[0.025] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#19334d] text-lg font-bold text-cyan-400">
                        {route.number}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {route.name ||
                            `Marşrut ${route.number}`}
                        </div>

                        <div className="mt-1 truncate text-xs text-slate-400">
                          {route.operator.name}
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        className="text-slate-500"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span
                        className={
                          route.isActive
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }
                      >
                        {route.isActive ? "● Aktiv" : "○ Deaktiv"}
                      </span>

                      <span className="text-slate-500">
                        {route._count.buses} avtobus
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className={`${panelStyle} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h2 className="font-semibold">
                  Bakı marşrut xəritəsi
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  OpenStreetMap · Saxlanılmış marşrutlar
                </p>
              </div>

              <span className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300">
                Ümumi xəritə
              </span>
            </div>

            <div className="relative h-[520px] isolate overflow-hidden md:h-[650px]">
              <RouteMap
                routes={displayRoutes}
                selectedId={selectedId}
                editing={false}
                activeDirection="OUTBOUND"
                draft={[]}
                onAddPoint={() => {}}
              />
            </div>
          </section>
        </div>

        {selectedRoute && (
          <section className={`${panelStyle} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">
                  Marşrut {selectedRoute.number}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedRoute.operator.name}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/routes/${encodeURIComponent(
                    selectedRoute.id
                  )}/edit`}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5"
                >
                  <Pencil size={16} />
                  Redaktə
                </Link>

                <button
                  type="button"
                  disabled={deletingId === selectedRoute.id}
                  onClick={() =>
                    void deleteRoute(selectedRoute)
                  }
                  className="flex items-center gap-2 rounded-xl border border-rose-400/20 px-4 py-2.5 text-sm text-rose-400 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Sil
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(
                ["OUTBOUND", "INBOUND"] as Direction[]
              ).map((type) => {
                const direction =
                  selectedRoute.directions.find(
                    (item) => item.type === type
                  );

                return (
                  <div
                    key={type}
                    className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div
                      className={`mb-2 text-xs font-semibold ${
                        type === "OUTBOUND"
                          ? "text-cyan-400"
                          : "text-amber-400"
                      }`}
                    >
                      {type === "OUTBOUND"
                        ? "GEDİŞ A → B"
                        : "DÖNÜŞ B → A"}
                    </div>

                    <p className="text-sm">
                      {direction?.originName || "—"} →{" "}
                      {direction?.destinationName || "—"}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {
                        geometryToPoints(
                          direction?.geometry
                        ).length
                      }{" "}
                      xəritə nöqtəsi
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className="text-xs text-slate-500">
          Smart Transit · Route Management · PostgreSQL + Prisma
        </footer>
      </div>
    </main>
  );
}
