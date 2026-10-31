
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BusFront,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  Navigation,
} from "lucide-react";

import AnomalyAlerts from "@/components/transit/AnomalyAlerts";
import type { OperatorLiveBus } from "@/components/transit/OperatorGpsMap";

const OperatorGpsMap = dynamic(
  () => import("@/components/transit/OperatorGpsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center bg-[#13233a] text-sm text-cyan-300">
        GPS xəritəsi yüklənir...
      </div>
    ),
  }
);

type RouteAnalytics = {
  id: string;
  number: string;
  name: string | null;
  counts: {
    low: number;
    medium: number;
    high: number;
    total: number;
  };
  highPercent: number;
  verifiedCount: number;
  latestReportAt: string | null;
};

type AnalyticsResponse = {
  success: boolean;
  windowMinutes: number;
  generatedAt: string;
  summary: {
    totalReports: number;
    highReports: number;
    activeRoutes: number;
  };
  routes: RouteAnalytics[];
};

export default function OperatorPage() {
  const [analytics, setAnalytics] =
    useState<AnalyticsResponse | null>(null);

  const [buses, setBuses] = useState<OperatorLiveBus[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(
    null
  );

  const refresh = useCallback(async () => {
    try {
      setUpdating(true);

      const [analyticsResponse, busesResponse] =
        await Promise.all([
          fetch("/api/operator/analytics", {
            cache: "no-store",
          }),
          fetch("/api/live/buses", {
            cache: "no-store",
          }),
        ]);

      if (!analyticsResponse.ok || !busesResponse.ok) {
        throw new Error("Analitika və ya GPS məlumatları alınmadı.");
      }

      const analyticsData: AnalyticsResponse =
        await analyticsResponse.json();

      const busData = await busesResponse.json();

      if (!analyticsData.success || !busData.success) {
        throw new Error("API məlumatları düzgün qaytarmadı.");
      }

      setAnalytics(analyticsData);
      setBuses(busData.buses ?? []);
      setLastUpdated(new Date().toISOString());
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Məlumatlar yenilənmədi."
      );
    } finally {
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const interval = setInterval(() => {
      void refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!analytics?.routes.length) return;

    const selectedExists = analytics.routes.some(
      (route) => route.id === selectedRouteId
    );

    if (selectedExists) return;

    const preferred =
      analytics.routes.find(
        (route) => route.counts.total > 0
      ) ?? analytics.routes[0];

    setSelectedRouteId(preferred.id);
  }, [analytics, selectedRouteId]);

  const selectedRoute = useMemo(
    () =>
      analytics?.routes.find(
        (route) => route.id === selectedRouteId
      ),
    [analytics, selectedRouteId]
  );

  const routeBuses = useMemo(
    () =>
      buses.filter(
        (bus) => bus.routeId === selectedRouteId
      ),
    [buses, selectedRouteId]
  );

  const freshBuses = useMemo(
    () => routeBuses.filter((bus) => bus.position?.isFresh),
    [routeBuses]
  );

  const cards = [
    {
      label: "Sərnişin bildirişləri",
      value: analytics?.summary.totalReports ?? 0,
      icon: Users,
    },
    {
      label: "Yüksək sıxlıq bildirişləri",
      value: analytics?.summary.highReports ?? 0,
      icon: AlertTriangle,
    },
    {
      label: "Aktiv marşrutlar",
      value: analytics?.summary.activeRoutes ?? 0,
      icon: Activity,
    },
    {
      label: "GPS aktiv avtobuslar",
      value: buses.filter((bus) => bus.position?.isFresh)
        .length,
      icon: BusFront,
    },
  ];

  return (
    <main className="min-h-screen bg-[#071120] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-widest text-cyan-400">
              <Activity size={17} />
              SMART TRANSIT · OPERATIONS
            </div>

            <h1 className="text-3xl font-bold">
              Operator Analytics
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Sərnişin sıxlığı, avtobus GPS izləməsi və
              avtomatik anomaliya aşkarlanması
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={updating}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={updating ? "animate-spin" : ""}
              />
              Yenilə
            </button>

            <Link
              href="/passenger"
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#071120] transition hover:bg-cyan-400"
            >
              Sərnişin paneli
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-[#101c31] p-5"
              >
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Icon size={17} className="text-cyan-400" />
                  {card.label}
                </div>

                <div className="mt-3 text-3xl font-bold">
                  {card.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* ANOMALY DETECTION */}
        <AnomalyAlerts />

        {/* MAIN ANALYTICS */}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          {/* LEFT: ROUTES & MAP */}
          <div className="min-w-0 space-y-5">
            {/* GPS MAP */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#101c31]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Navigation
                      size={19}
                      className="text-cyan-400"
                    />
                    <h2 className="font-semibold">
                      Avtobus GPS xəritəsi
                    </h2>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {selectedRoute
                      ? `№${selectedRoute.number} · ${selectedRoute.name ?? ""}`
                      : "Marşrut seçilməyib"}
                  </p>
                </div>

                <span className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5 text-xs text-green-300">
                  {freshBuses.length} aktiv GPS
                </span>
              </div>

              <div className="relative isolate h-[420px] overflow-hidden md:h-[520px]">
                <OperatorGpsMap
                  buses={routeBuses}
                  selectedRouteId={selectedRouteId}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-3 text-xs text-slate-400">
                <span>
                  OpenStreetMap · 5 saniyəlik yenilənmə
                </span>

                {lastUpdated && (
                  <span>
                    Son yenilənmə:{" "}
                    {new Date(lastUpdated).toLocaleTimeString(
                      "az-AZ"
                    )}
                  </span>
                )}
              </div>
            </section>

            {/* ROUTE DENSITY */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#101c31]">
              <div className="border-b border-white/10 p-5">
                <h2 className="font-semibold">
                  Marşrutlar üzrə sıxlıq
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Son 30 dəqiqənin sərnişin müşahidələri.
                  Bildiriş sayı sərnişin sayı demək deyil.
                </p>
              </div>

              <div className="grid gap-3 p-4 md:grid-cols-2">
                {(analytics?.routes ?? []).map((route) => {
                  const active =
                    route.id === selectedRouteId;

                  const total = route.counts.total;

                  return (
                    <button
                      type="button"
                      key={route.id}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-cyan-400 bg-cyan-400/[0.06]"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            №{route.number}
                          </div>

                          <p className="mt-1 text-xs text-slate-400">
                            {route.name}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-bold">
                            {total}
                          </div>

                          <div className="text-xs text-slate-400">
                            bildiriş
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/5">
                        {total > 0 && (
                          <>
                            <div
                              className="bg-green-500"
                              style={{
                                width: `${
                                  (route.counts.low / total) * 100
                                }%`,
                              }}
                            />
                            <div
                              className="bg-yellow-400"
                              style={{
                                width: `${
                                  (route.counts.medium / total) * 100
                                }%`,
                              }}
                            />
                            <div
                              className="bg-red-500"
                              style={{
                                width: `${
                                  (route.counts.high / total) * 100
                                }%`,
                              }}
                            />
                          </>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        <span className="text-green-300">
                          Aşağı: {route.counts.low}
                        </span>
                        <span className="text-yellow-300">
                          Orta: {route.counts.medium}
                        </span>
                        <span className="text-red-300">
                          Yüksək: {route.counts.high}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {!analytics?.routes.length && (
                  <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                    Marşrut məlumatları mövcud deyil.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT: SELECTED ROUTE */}
          <section className="space-y-4 rounded-2xl border border-white/10 bg-[#101c31] p-5">
            <div>
              <h2 className="font-semibold">
                Seçilmiş marşrut
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {selectedRoute
                  ? `№${selectedRoute.number} — ${
                      selectedRoute.name ?? ""
                    }`
                  : "Marşrut seçilməyib"}
              </p>
            </div>

            <div className="rounded-xl bg-white/[0.03] p-4">
              <div className="text-sm text-slate-400">
                Yüksək sıxlıq payı
              </div>

              <div className="mt-2 text-3xl font-bold text-red-300">
                {selectedRoute?.counts.total
                  ? `${selectedRoute.highPercent}%`
                  : "Məlumat yoxdur"}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Son 30 dəqiqədəki bildirişlər əsasında
                hesablanır.
              </p>
            </div>

            <div className="rounded-xl bg-white/[0.03] p-4">
              <div className="text-sm text-slate-400">
                Təsdiqlənmiş bildirişlər
              </div>
              <div className="mt-2 text-2xl font-bold text-cyan-300">
                {selectedRoute?.verifiedCount ?? 0}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin
                size={17}
                className="text-cyan-400"
              />
              Avtobusların koordinatları
            </div>

            {routeBuses.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                Bu marşruta bağlı avtobus tapılmadı.
              </p>
            ) : (
              routeBuses.map((bus) => (
                <div
                  key={bus.id}
                  className="rounded-xl border border-white/10 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {bus.fleetCode}
                    </span>

                    <span
                      className={`text-xs ${
                        bus.position?.isFresh
                          ? "text-green-300"
                          : "text-slate-500"
                      }`}
                    >
                      {bus.position?.isFresh
                        ? "GPS aktiv"
                        : "GPS köhnədir"}
                    </span>
                  </div>

                  {bus.position ? (
                    <>
                      <p className="mt-3 font-mono text-sm text-cyan-300">
                        {bus.position.latitude.toFixed(6)}
                        ,{" "}
                        {bus.position.longitude.toFixed(6)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Mənbə:{" "}
                        {bus.position.source === "SIMULATION"
                          ? "Simulyasiya GPS"
                          : bus.position.source}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Sürət:{" "}
                        {bus.position.speedKmh ?? "—"} km/saat
                      </p>

                      <a
                        href={`https://www.openstreetmap.org/?mlat=${bus.position.latitude}&mlon=${bus.position.longitude}#map=16/${bus.position.latitude}/${bus.position.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-xs font-semibold text-cyan-400 underline"
                      >
                        OpenStreetMap-də aç
                      </a>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">
                      GPS mövqeyi yoxdur.
                    </p>
                  )}
                </div>
              ))
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 size={14} />
              {freshBuses.length} aktiv GPS mövqeyi
            </div>

            <p className="text-xs leading-5 text-amber-300/80">
              PENDING bildirişlər təsdiqlənməmiş
              sərnişin müşahidələridir. SIMULATION
              koordinatları real avtobus GPS məlumatı deyil.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
