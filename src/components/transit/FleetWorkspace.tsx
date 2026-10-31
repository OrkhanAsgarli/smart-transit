
"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import {
  BusFront,
  MapPin,
  Plus,
  Trash2,
  ArrowLeft,
  Route as RouteIcon,
  MousePointer2,
  Save,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

type Point = [number, number];
type Direction = "forward" | "reverse";

type TransitRoute = {
  id: string;
  number: string;
  from: string;
  to: string;
  forward: Point[];
  reverse: Point[];
};

type TransitBus = {
  id: string;
  plate: string;
  routeId: string;
  direction: Direction;
  capacity: number;
};

const STORAGE_KEY = "smart-transit-fleet-v1";
const BAKU: Point = [40.4093, 49.8671];

function MapClickHandler({
  enabled,
  onAddPoint,
}: {
  enabled: boolean;
  onAddPoint: (point: Point) => void;
}) {
  useMapEvents({
    click(event) {
      if (enabled) {
        onAddPoint([event.latlng.lat, event.latlng.lng]);
      }
    },
  });

  return null;
}

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-[#17263c] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400";

const buttonClass =
  "rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#071120] hover:bg-cyan-300";

export default function FleetWorkspace() {
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [buses, setBuses] = useState<TransitBus[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [direction, setDirection] =
    useState<Direction>("forward");

  const [editing, setEditing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);

  const [routeNumber, setRouteNumber] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");

  const [busPlate, setBusPlate] = useState("");
  const [busCapacity, setBusCapacity] = useState("90");
  const [busRouteId, setBusRouteId] = useState("");
  const [busDirection, setBusDirection] =
    useState<Direction>("forward");

  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const saved = JSON.parse(raw);
        setRoutes(Array.isArray(saved.routes) ? saved.routes : []);
        setBuses(Array.isArray(saved.buses) ? saved.buses : []);
      }
    } catch {
      console.warn("Saxlanmış məlumatlar oxunmadı.");
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ routes, buses })
    );
  }, [routes, buses, loaded]);

  const selectedRoute = routes.find(
    (r) => r.id === selectedRouteId
  );

  const activePoints = selectedRoute
    ? selectedRoute[direction]
    : [];

  function createRoute() {
    if (!routeNumber.trim() || !routeFrom.trim() || !routeTo.trim()) {
      setMessage("Marşrut nömrəsini və hər iki istiqamət adını yaz.");
      return;
    }

    if (routes.some((r) => r.number === routeNumber.trim())) {
      setMessage("Bu marşrut nömrəsi artıq mövcuddur.");
      return;
    }

    const route: TransitRoute = {
      id: crypto.randomUUID(),
      number: routeNumber.trim(),
      from: routeFrom.trim(),
      to: routeTo.trim(),
      forward: [],
      reverse: [],
    };

    setRoutes((prev) => [...prev, route]);
    setSelectedRouteId(route.id);
    setBusRouteId(route.id);
    setDirection("forward");
    setDraftPoints([]);
    setEditing(true);

    setRouteNumber("");
    setRouteFrom("");
    setRouteTo("");

    setMessage(
      "Marşrut yaradıldı. İndi xəritədə gediş xəttinin nöqtələrini ardıcıllıqla seç."
    );
  }

  function startEditing(nextDirection: Direction) {
    if (!selectedRoute) return;

    setDirection(nextDirection);
    setDraftPoints([...selectedRoute[nextDirection]]);
    setEditing(true);
    setMessage("Xəritədə nöqtələr əlavə et, sonra xətti yadda saxla.");
  }

  function addPoint(point: Point) {
    setDraftPoints((prev) => [...prev, point]);
  }

  function saveGeometry() {
    if (!selectedRoute) return;

    if (draftPoints.length < 2) {
      setMessage("Marşrut üçün ən azı iki nöqtə seçilməlidir.");
      return;
    }

    setRoutes((prev) =>
      prev.map((r) =>
        r.id === selectedRoute.id
          ? { ...r, [direction]: [...draftPoints] }
          : r
      )
    );

    setEditing(false);
    setMessage("Marşrut xətti saxlanıldı.");
  }

  function addBus() {
    const capacity = Number(busCapacity);
    const plate = busPlate.trim();

    if (!plate || !busRouteId) {
      setMessage("Avtobus nömrəsini və marşrutu daxil et.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setMessage("Düzgün sərnişin tutumu daxil et.");
      return;
    }

    if (
      buses.some(
        (b) => b.plate.toLowerCase() === plate.toLowerCase()
      )
    ) {
      setMessage("Bu avtobus artıq qeydiyyatdadır.");
      return;
    }

    const assignedRoute = routes.find(
      (r) => r.id === busRouteId
    );

    if (!assignedRoute || assignedRoute[busDirection].length < 2) {
      setMessage(
        "Əvvəl bu istiqamət üçün xəritədə marşrut xətti yarat."
      );
      return;
    }

    const bus: TransitBus = {
      id: crypto.randomUUID(),
      plate,
      routeId: busRouteId,
      direction: busDirection,
      capacity,
    };

    setBuses((prev) => [...prev, bus]);
    setBusPlate("");

    setMessage(
      "Avtobus əlavə edildi. Xəritədə ilkin marşrut nöqtəsində göstərilir."
    );
  }

  function deleteBus(id: string) {
    setBuses((prev) => prev.filter((b) => b.id !== id));
    setMessage("Avtobus silindi.");
  }

  function deleteRoute() {
    if (!selectedRoute) return;

    setRoutes((prev) =>
      prev.filter((r) => r.id !== selectedRoute.id)
    );
    setBuses((prev) =>
      prev.filter((b) => b.routeId !== selectedRoute.id)
    );

    setSelectedRouteId("");
    setEditing(false);
    setDraftPoints([]);

    setMessage("Marşrut və ona bağlı avtobuslar silindi.");
  }

  return (
    <main className="min-h-screen bg-[#071120] p-4 text-white md:p-7">
      <div className="mx-auto max-w-[1650px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-400"
            >
              <ArrowLeft size={15} />
              Əsas panelə qayıt
            </Link>

            <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
              <BusFront className="text-cyan-400" />
              Fleet Management
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Bakı şəhəri · Real xəritə · Marşrut və avtobus idarəetməsi
            </p>
          </div>

          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
            Real xəritə / Manual fleet data
          </span>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ["Marşrutlar", routes.length],
            ["Avtobuslar", buses.length],
            [
              "Xəritəsi hazır marşrutlar",
              routes.filter(
                (r) => r.forward.length >= 2 || r.reverse.length >= 2
              ).length,
            ],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/10 bg-[#101c31] p-4"
            >
              <div className="text-xs text-slate-400">{label}</div>
              <div className="mt-2 text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200"
          >
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[370px_minmax(0,1fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-[#101c31] p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <RouteIcon size={18} className="text-cyan-400" />
                Yeni marşrut yarat
              </h2>

              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Marşrut № (məsələn, 65)"
                  value={routeNumber}
                  onChange={(e) => setRouteNumber(e.target.value)}
                />

                <input
                  className={fieldClass}
                  placeholder="Başlanğıc dayanacaq"
                  value={routeFrom}
                  onChange={(e) => setRouteFrom(e.target.value)}
                />

                <input
                  className={fieldClass}
                  placeholder="Son dayanacaq"
                  value={routeTo}
                  onChange={(e) => setRouteTo(e.target.value)}
                />

                <button
                  onClick={createRoute}
                  className={`${buttonClass} flex w-full items-center justify-center gap-2`}
                >
                  <Plus size={17} />
                  Marşrut yarat
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101c31] p-5">
              <h2 className="mb-4 font-semibold">
                Marşrut istiqamətləri
              </h2>

              <select
                className={fieldClass}
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  setEditing(false);
                  setDraftPoints([]);
                }}
              >
                <option value="">Marşrut seç</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} — {r.from} / {r.to}
                  </option>
                ))}
              </select>

              {selectedRoute && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => startEditing("forward")}
                      className={`rounded-xl border p-3 text-xs ${
                        editing && direction === "forward"
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10"
                      }`}
                    >
                      Gediş: A → B
                    </button>

                    <button
                      onClick={() => startEditing("reverse")}
                      className={`rounded-xl border p-3 text-xs ${
                        editing && direction === "reverse"
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10"
                      }`}
                    >
                      Dönüş: B → A
                    </button>
                  </div>

                  <p className="text-xs leading-5 text-slate-400">
                    Xəritədə yolun keçəcəyi nöqtələri ardıcıllıqla
                    seç. Gediş və dönüş ayrıca saxlanılır.
                  </p>

                  {editing && (
                    <>
                      <div className="rounded-xl bg-white/5 p-3 text-xs">
                        <MousePointer2
                          size={15}
                          className="mr-2 inline text-cyan-400"
                        />
                        Seçilmiş nöqtələr: {draftPoints.length}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setDraftPoints((prev) => prev.slice(0, -1))
                          }
                          className="flex-1 rounded-xl border border-white/10 p-3 text-xs"
                        >
                          <RotateCcw size={14} className="mr-1 inline" />
                          Geri al
                        </button>

                        <button
                          onClick={saveGeometry}
                          className={`${buttonClass} flex-1`}
                        >
                          <Save size={14} className="mr-1 inline" />
                          Yadda saxla
                        </button>
                      </div>
                    </>
                  )}

                  <button
                    onClick={deleteRoute}
                    className="flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 size={14} />
                    Marşrutu sil
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101c31] p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <BusFront size={18} className="text-cyan-400" />
                Avtobus əlavə et
              </h2>

              <div className="space-y-3">
                <input
                  className={fieldClass}
                  placeholder="Avtobus ID / qeydiyyat nömrəsi"
                  value={busPlate}
                  onChange={(e) => setBusPlate(e.target.value)}
                />

                <input
                  type="number"
                  min="1"
                  className={fieldClass}
                  placeholder="Tutum"
                  value={busCapacity}
                  onChange={(e) => setBusCapacity(e.target.value)}
                />

                <select
                  className={fieldClass}
                  value={busRouteId}
                  onChange={(e) => setBusRouteId(e.target.value)}
                >
                  <option value="">Marşrut seç</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number} — {r.from} → {r.to}
                    </option>
                  ))}
                </select>

                <select
                  className={fieldClass}
                  value={busDirection}
                  onChange={(e) =>
                    setBusDirection(e.target.value as Direction)
                  }
                >
                  <option value="forward">Gediş A → B</option>
                  <option value="reverse">Dönüş B → A</option>
                </select>

                <button
                  onClick={addBus}
                  className={`${buttonClass} flex w-full items-center justify-center gap-2`}
                >
                  <Plus size={17} />
                  Avtobus əlavə et
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#101c31]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <h2 className="font-semibold">Bakı canlı xəritə paneli</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    OpenStreetMap · Real küçələr və yollar
                  </p>
                </div>

                <span className="rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300">
                  {editing ? "Marşrut redaktəsi" : "Xəritə görünüşü"}
                </span>
              </div>

              <div className="h-[500px] w-full md:h-[650px]">
                <MapContainer
                  center={BAKU}
                  zoom={12}
                  scrollWheelZoom
                  className="h-full w-full"
                  style={{ background: "#dce8e8" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />

                  <MapClickHandler
                    enabled={editing}
                    onAddPoint={addPoint}
                  />

                  {routes.map((r) => (
                    <Polyline
                      key={`${r.id}-forward`}
                      positions={r.forward}
                      pathOptions={{
                        color: "#0891b2",
                        weight: 5,
                        opacity:
                          selectedRouteId === r.id ? 1 : 0.35,
                      }}
                    />
                  ))}

                  {routes.map((r) => (
                    <Polyline
                      key={`${r.id}-reverse`}
                      positions={r.reverse}
                      pathOptions={{
                        color: "#f59e0b",
                        weight: 4,
                        dashArray: "8 7",
                        opacity:
                          selectedRouteId === r.id ? 0.9 : 0.25,
                      }}
                    />
                  ))}

                  {editing && (
                    <Polyline
                      positions={draftPoints}
                      pathOptions={{
                        color: "#a855f7",
                        weight: 6,
                        dashArray: "5 8",
                      }}
                    />
                  )}

                  {editing &&
                    draftPoints.map((p, index) => (
                      <CircleMarker
                        key={index}
                        center={p}
                        radius={6}
                        pathOptions={{
                          color: "#fff",
                          fillColor: "#9333ea",
                          fillOpacity: 1,
                        }}
                      >
                        <Popup>
                          Nöqtə {index + 1}
                          <br />
                          {p[0].toFixed(5)}, {p[1].toFixed(5)}
                        </Popup>
                      </CircleMarker>
                    ))}

                  {!editing &&
                    activePoints.length > 0 && (
                      <>
                        <CircleMarker
                          center={activePoints[0]}
                          radius={9}
                          pathOptions={{
                            color: "#fff",
                            fillColor: "#16a34a",
                            fillOpacity: 1,
                          }}
                        >
                          <Popup>Başlanğıc nöqtə</Popup>
                        </CircleMarker>

                        <CircleMarker
                          center={activePoints[activePoints.length - 1]}
                          radius={9}
                          pathOptions={{
                            color: "#fff",
                            fillColor: "#dc2626",
                            fillOpacity: 1,
                          }}
                        >
                          <Popup>Son nöqtə</Popup>
                        </CircleMarker>
                      </>
                    )}

                  {buses.map((bus) => {
                    const route = routes.find(
                      (r) => r.id === bus.routeId
                    );

                    const points = route?.[bus.direction] || [];
                    if (points.length === 0) return null;

                    return (
                      <CircleMarker
                        key={bus.id}
                        center={points[0]}
                        radius={11}
                        pathOptions={{
                          color: "#ffffff",
                          weight: 2,
                          fillColor: "#0284c7",
                          fillOpacity: 1,
                        }}
                      >
                        <Popup>
                          <strong>Avtobus: {bus.plate}</strong>
                          <br />
                          Marşrut: {route?.number}
                          <br />
                          İstiqamət:{" "}
                          {bus.direction === "forward"
                            ? "Gediş"
                            : "Dönüş"}
                          <br />
                          Tutum: {bus.capacity}
                          <br />
                          <em>
                            İlkin mövqe — real GPS deyil
                          </em>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>

              <div className="flex flex-wrap gap-4 p-4 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                  Gediş xətti
                </span>
                <span className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Dönüş xətti
                </span>
                <span className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Redaktə
                </span>
                <span className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full bg-sky-600" />
                  Avtobusun ilkin mövqeyi
                </span>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101c31] p-5">
              <h2 className="mb-4 font-semibold">
                Qeydiyyatdan keçmiş avtobuslar
              </h2>

              {buses.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Hələ avtobus əlavə edilməyib.
                </div>
              ) : (
                <div className="space-y-3">
                  {buses.map((bus) => {
                    const route = routes.find(
                      (r) => r.id === bus.routeId
                    );

                    return (
                      <div
                        key={bus.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-400">
                            <BusFront size={20} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold">
                              {bus.plate}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Marşrut {route?.number} ·{" "}
                              {bus.direction === "forward"
                                ? "Gediş"
                                : "Dönüş"}{" "}
                              · {bus.capacity} yer
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteBus(bus.id)}
                          aria-label="Avtobusu sil"
                          className="rounded-xl p-2 text-rose-400 hover:bg-rose-400/10"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin size={14} />
          Marşrutlar və avtobuslar hazırda bu brauzerin localStorage
          yaddaşında saxlanılır.
        </p>
      </div>
    </main>
  );
}
