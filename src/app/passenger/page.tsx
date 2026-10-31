
"use client";

import CrowdReportForm from "@/components/transit/CrowdReportForm";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BusFront,
  Clock3,
  MapPin,
  RefreshCw,
  Route as RouteIcon,
  Users,
  AlertCircle,
  Radio,
} from "lucide-react";

import type {
  LiveBus,
  PassengerStop,
} from "@/components/transit/PassengerMap";

const PassengerMap = dynamic(
  () => import("@/components/transit/PassengerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[480px] items-center justify-center bg-[#13233a] text-cyan-300">
        Xəritə yüklənir...
      </div>
    ),
  }
);

type Direction = {
  id: string;
  type: "OUTBOUND" | "INBOUND";
  originName: string;
  destinationName: string;
  stops: PassengerStop[];
};

type PassengerRoute = {
  id: string;
  number: string;
  name: string | null;
  operator: {
    name: string;
  };
  directions: Direction[];
};

type EtaResult = {
  success?: boolean;
  available: boolean;
  etaMinutes?: number;
  distanceKm?: number;
  reason?: string;
  source?: string;
  warning?: string;
};

const selectStyle =
  "w-full rounded-xl border border-white/10 bg-[#17263c] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

export default function PassengerPage() {
  const [routes, setRoutes] = useState<PassengerRoute[]>([]);
  const [buses, setBuses] = useState<LiveBus[]>([]);

  const [routeId, setRouteId] = useState("");
  const [directionId, setDirectionId] = useState("");
  const [stopId, setStopId] = useState("");
  const [selectedBusId, setSelectedBusId] = useState("");

  const [etas, setEtas] = useState<Record<string, EtaResult>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gpsError, setGpsError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(
    null
  );

  // -----------------------------------------------------
  // 1. Marşrut və real dayanacaqlar
  // -----------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      try {
        const response = await fetch("/api/passenger/routes", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Marşrutlar yüklənmədi."
          );
        }

        if (cancelled) return;

        const list: PassengerRoute[] = result.routes ?? [];

        setRoutes(list);

        // Əvvəlcə real dayanacaqları olan marşrut.
        const first =
          list.find(
            (route) =>
              route.directions.some(
                (direction) => direction.stops.length > 0
              )
          ) ?? list[0];

        if (first) {
          setRouteId(first.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Marşrutların yüklənməsi zamanı xəta."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRoutes();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------
  // 2. Seçilmiş marşrut və istiqamət
  // -----------------------------------------------------

  const route = useMemo(
    () => routes.find((item) => item.id === routeId),
    [routes, routeId]
  );

  const directions = route?.directions;

  useEffect(() => {
    const first =
      directions?.find(
        (direction) => direction.type === "OUTBOUND"
      ) ?? directions?.[0];

    setDirectionId(first?.id ?? "");
  }, [routeId, directions]);

  const direction = useMemo(
    () =>
      route?.directions.find(
        (item) => item.id === directionId
      ),
    [route, directionId]
  );

  const stops = direction?.stops;

  useEffect(() => {
    setStopId(stops?.[0]?.id ?? "");
  }, [directionId, stops]);

  const activeStop = useMemo(
    () => stops?.find((stop) => stop.id === stopId),
    [stops, stopId]
  );

  // -----------------------------------------------------
  // 3. Canlı GPS məlumatları
  // -----------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function refreshBuses() {
      try {
        const response = await fetch("/api/live/buses", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("GPS məlumatları alınmadı.");
        }

        const result = await response.json();

        if (cancelled) return;

        setBuses(result.buses ?? []);
        setGpsError("");
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        if (!cancelled) {
          setGpsError(
            err instanceof Error
              ? err.message
              : "Canlı GPS bağlantısında xəta."
          );
        }
      }
    }

    void refreshBuses();

    const interval = setInterval(() => {
      void refreshBuses();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // -----------------------------------------------------
  // 4. Yalnız seçilmiş marşrut və istiqamətin avtobusları
  // -----------------------------------------------------

  const visibleBuses = useMemo(
    () =>
      buses.filter(
        (bus) =>
          bus.routeId === routeId &&
          bus.directionId === directionId &&
          bus.position?.isFresh === true
      ),
    [buses, routeId, directionId]
  );

  const busIdsKey = useMemo(
    () => visibleBuses.map((bus) => bus.id).join(","),
    [visibleBuses]
  );

  // -----------------------------------------------------
  // 5. Avtobusun seçilməsi
  // -----------------------------------------------------

  useEffect(() => {
    setSelectedBusId((currentId) => {
      if (visibleBuses.some((bus) => bus.id === currentId)) {
        return currentId;
      }

      return visibleBuses[0]?.id ?? "";
    });
  }, [busIdsKey, visibleBuses]);

  const selectedBus = useMemo(
    () =>
      visibleBuses.find(
        (bus) => bus.id === selectedBusId
      ),
    [visibleBuses, selectedBusId]
  );

  // -----------------------------------------------------
  // 6. ETA — hər 5 saniyədə yenilənir
  // -----------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function refreshEtas() {
      if (!stopId || !busIdsKey) {
        if (!cancelled) {
          setEtas({});
        }
        return;
      }

      const ids = busIdsKey.split(",").filter(Boolean);

      const results = await Promise.all(
        ids.map(async (busId) => {
          try {
            const url =
              `/api/eta?busId=${encodeURIComponent(busId)}` +
              `&stopId=${encodeURIComponent(stopId)}`;

            const response = await fetch(url, {
              cache: "no-store",
            });

            const data: EtaResult = await response.json();

            return [
              busId,
              response.ok
                ? data
                : {
                    available: false,
                    reason: "ETA hesablanmadı.",
                  },
            ] as const;
          } catch {
            return [
              busId,
              {
                available: false,
                reason: "ETA məlumatı alınmadı.",
              },
            ] as const;
          }
        })
      );

      if (!cancelled) {
        setEtas(Object.fromEntries(results));
      }
    }

    void refreshEtas();

    const interval = setInterval(() => {
      void refreshEtas();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stopId, busIdsKey]);

  // -----------------------------------------------------
  // 7. Render
  // -----------------------------------------------------

  return (
    <main className="min-h-screen bg-[#071120] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* HEADER */}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-widest text-cyan-400">
              <BusFront size={17} />
              SMART TRANSIT
            </div>

            <h1 className="text-3xl font-bold">
              Sərnişin paneli
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Marşrutlar, real dayanacaqlar, GPS izləmə və
              sərnişin sıxlığı bildirişləri
            </p>
          </div>

          <Link
            href="/routes"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5"
          >
            Route Management
          </Link>
        </header>

        {/* ERROR */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {gpsError && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-300">
            <AlertCircle size={18} />
            {gpsError}
          </div>
        )}

        {/* CONTENT */}

        <div className="grid items-start gap-5 xl:grid-cols-[370px_minmax(0,1fr)]">

          {/* LEFT PANEL */}

          <section className="space-y-5">

            {/* ROUTE SELECTION */}

            <div className="space-y-5 rounded-2xl border border-white/10 bg-[#101c31] p-5">
              <div className="flex items-center gap-2">
                <RouteIcon
                  size={19}
                  className="text-cyan-400"
                />

                <h2 className="font-semibold">
                  Səyahət seçimi
                </h2>
              </div>

              {/* ROUTE */}

              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Marşrut
                </label>

                <select
                  value={routeId}
                  disabled={loading}
                  onChange={(event) => {
                    setRouteId(event.target.value);
                    setSelectedBusId("");
                    setEtas({});
                  }}
                  className={selectStyle}
                >
                  <option value="">
                    Marşrut seç
                  </option>

                  {routes.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      №{item.number} —{" "}
                      {item.name ?? item.operator.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* DIRECTION */}

              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  İstiqamət
                </label>

                <select
                  value={directionId}
                  onChange={(event) => {
                    setDirectionId(event.target.value);
                    setSelectedBusId("");
                    setEtas({});
                  }}
                  className={selectStyle}
                >
                  <option value="">
                    İstiqamət seç
                  </option>

                  {route?.directions.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.originName} →{" "}
                      {item.destinationName}
                    </option>
                  ))}
                </select>
              </div>

              {/* STOP */}

              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Dayanacaq
                </label>

                <select
                  value={stopId}
                  onChange={(event) =>
                    setStopId(event.target.value)
                  }
                  disabled={!stops?.length}
                  className={selectStyle}
                >
                  <option value="">
                    Dayanacaq seç
                  </option>

                  {stops?.map((stop) => (
                    <option
                      key={`${stop.id}-${stop.sequence}`}
                      value={stop.id}
                    >
                      {stop.sequence}. {stop.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ACTIVE STOP */}

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin size={15} />
                  Seçilmiş dayanacaq
                </div>

                <div className="mt-2 font-semibold">
                  {activeStop?.name ??
                    "Dayanacaq seçilməyib"}
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {stops?.length ?? 0} dayanacaq
                </p>
              </div>
            </div>

            {/* ETA SECTION */}

            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#101c31] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3
                    size={18}
                    className="text-cyan-400"
                  />

                  <h2 className="font-semibold">
                    Avtobusların ETA göstəricisi
                  </h2>
                </div>

                <RefreshCw
                  size={16}
                  className="text-slate-500"
                />
              </div>

              {visibleBuses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                  Bu istiqamətdə aktiv GPS mövqeyi olan
                  avtobus yoxdur.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleBuses.map((bus) => {
                    const eta = etas[bus.id];
                    const isSelected =
                      selectedBusId === bus.id;

                    return (
                      <button
                        key={bus.id}
                        type="button"
                        onClick={() =>
                          setSelectedBusId(bus.id)
                        }
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-400/[0.09]"
                            : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <BusFront
                              size={19}
                              className="text-cyan-400"
                            />

                            <span className="font-semibold">
                              {bus.fleetCode}
                            </span>
                          </div>

                          {isSelected && (
                            <span className="rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-semibold text-cyan-300">
                              Seçilib
                            </span>
                          )}
                        </div>

                        <div className="mt-3 text-2xl font-bold text-cyan-300">
                          {eta?.available
                            ? `${eta.etaMinutes} dəq`
                            : "ETA yoxdur"}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {eta?.available
                            ? `Təxmini məsafə: ${eta.distanceKm} km`
                            : eta?.reason ??
                              "Məlumat gözlənilir"}
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs">
                          <Radio
                            size={13}
                            className="text-green-400"
                          />

                          <span className="text-green-300">
                            GPS aktiv
                          </span>

                          <span className="text-slate-500">
                            ·
                          </span>

                          <span className="text-amber-300">
                            {bus.position?.source ===
                            "SIMULATION"
                              ? "Simulyasiya"
                              : "GPS"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="text-xs leading-5 text-slate-500">
                ETA ilkin məsafə və sürət təxminidir.
                Trafik, yol şəbəkəsi və dayanacağın
                keçilməsi hələ nəzərə alınmır.
              </p>
            </div>

            {/* CROWD REPORTING */}

            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Users
                  size={19}
                  className="text-cyan-400"
                />

                <h2 className="font-semibold">
                  Sərnişin sıxlığı
                </h2>
              </div>

              {selectedBus ? (
                <CrowdReportForm
                  key={selectedBus.id}
                  busId={selectedBus.id}
                  busName={selectedBus.fleetCode}
                  stopId={stopId || undefined}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#101c31] p-5 text-sm text-slate-400">
                  Sıxlıq bildirişi göndərmək üçün
                  əvvəlcə aktiv avtobus seç.
                </div>
              )}
            </div>
          </section>

          {/* RIGHT — MAP */}

          <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#101c31]">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h2 className="font-semibold">
                  Canlı avtobus xəritəsi
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  OpenStreetMap · 5 saniyəlik yenilənmə
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5 text-xs text-green-300">
                  {visibleBuses.length} aktiv avtobus
                </span>

                {lastUpdated && (
                  <span className="text-xs text-slate-500">
                    {new Date(lastUpdated).toLocaleTimeString(
                      "az-AZ"
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="relative isolate h-[550px] overflow-hidden md:h-[730px]">
              <PassengerMap
                stops={stops ?? []}
                buses={visibleBuses}
                selectedStopId={stopId}
                onSelectStop={setStopId}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-white/10 px-5 py-3 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                Dayanacaq
              </span>

              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Seçilmiş dayanacaq
              </span>

              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                Simulyasiya/GPS avtobusu
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
