
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  Undo2,
  Trash2,
} from "lucide-react";
import type { Point } from "@/components/transit/RouteMap";

const RouteMap = dynamic(
  () => import("@/components/transit/RouteMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[480px] items-center justify-center bg-[#102033] text-cyan-300">
        Xəritə yüklənir...
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

type DirectionRecord = {
  type: Direction;
  originName: string;
  destinationName: string;
  geometry: unknown;
};

type RouteRecord = {
  id: string;
  number: string;
  name: string | null;
  isActive: boolean;
  operatorId: string;
  directions: DirectionRecord[];
};

type FormState = {
  operatorId: string;
  number: string;
  name: string;
  isActive: boolean;
  from: string;
  to: string;
  outbound: Point[];
  inbound: Point[];
};

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

const initialForm: FormState = {
  operatorId: "",
  number: "",
  name: "",
  isActive: true,
  from: "",
  to: "",
  outbound: [],
  inbound: [],
};

const inputStyle =
  "w-full rounded-xl border border-white/10 bg-[#17263c] px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50";

function formFromRoute(route: RouteRecord): FormState {
  const outbound = route.directions.find(
    (direction) => direction.type === "OUTBOUND"
  );

  const inbound = route.directions.find(
    (direction) => direction.type === "INBOUND"
  );

  return {
    operatorId: route.operatorId,
    number: route.number,
    name: route.name ?? "",
    isActive: route.isActive,
    from:
      outbound?.originName ||
      inbound?.destinationName ||
      "",
    to:
      outbound?.destinationName ||
      inbound?.originName ||
      "",
    outbound: geometryToPoints(outbound?.geometry),
    inbound: geometryToPoints(inbound?.geometry),
  };
}

export default function RouteEditor({
  routeId,
}: {
  routeId?: string;
}) {
  const router = useRouter();
  const editing = Boolean(routeId);

  const [operators, setOperators] = useState<Operator[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);

  const [activeDirection, setActiveDirection] =
    useState<Direction>("OUTBOUND");

  const [drawing, setDrawing] = useState(false);
  const [token, setToken] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [operatorsResponse, routesResponse] = await Promise.all([
        fetch("/api/operators", { cache: "no-store" }),
        editing
          ? fetch("/api/routes", { cache: "no-store" })
          : Promise.resolve(null),
      ]);

      if (!operatorsResponse.ok) {
        throw new Error("Operatorlar yüklənmədi.");
      }

      const operatorsData = await operatorsResponse.json();
      const operatorList: Operator[] =
        operatorsData.operators ?? [];

      setOperators(operatorList);

      if (editing) {
        if (!routesResponse?.ok) {
          throw new Error("Marşrutlar yüklənmədi.");
        }

        const routesData = await routesResponse.json();
        const route: RouteRecord | undefined =
          (routesData.routes ?? []).find(
            (item: RouteRecord) => item.id === routeId
          );

        if (!route) {
          throw new Error("Redaktə ediləcək marşrut tapılmadı.");
        }

        setForm(formFromRoute(route));
      } else {
        setForm({
          ...initialForm,
          operatorId: operatorList[0]?.id ?? "",
        });
      }

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Məlumat yüklənərkən xəta baş verdi."
      );
    } finally {
      setLoading(false);
    }
  }, [editing, routeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentPoints =
    activeDirection === "OUTBOUND"
      ? form.outbound
      : form.inbound;

  const otherPoints =
    activeDirection === "OUTBOUND"
      ? form.inbound
      : form.outbound;

  function updatePoints(updater: (points: Point[]) => Point[]) {
    const field =
      activeDirection === "OUTBOUND"
        ? "outbound"
        : "inbound";

    setForm((previous) => ({
      ...previous,
      [field]: updater(previous[field]),
    }));
  }

  function addPoint(point: Point) {
    updatePoints((points) => [...points, point]);
  }

  async function saveRoute() {
    setError("");

    if (!token.trim()) {
      setError("Developer tokenini daxil et.");
      return;
    }

    if (
      !form.operatorId ||
      !form.number.trim() ||
      !form.from.trim() ||
      !form.to.trim()
    ) {
      setError(
        "Operator, marşrut nömrəsi və başlanğıc/son məntəqələr tələb olunur."
      );
      return;
    }

    if (
      form.outbound.length === 1 ||
      form.inbound.length === 1
    ) {
      setError(
        "Hər istiqamətin xətti boş və ya ən azı 2 nöqtəli olmalıdır."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        operatorId: form.operatorId,
        number: form.number.trim(),
        name: form.name.trim(),
        isActive: form.isActive,
        directions: [
          {
            type: "OUTBOUND",
            originName: form.from.trim(),
            destinationName: form.to.trim(),
            points: form.outbound,
          },
          {
            type: "INBOUND",
            originName: form.to.trim(),
            destinationName: form.from.trim(),
            points: form.inbound,
          },
        ],
      };

      const response = await fetch(
        editing
          ? `/api/routes/${encodeURIComponent(routeId!)}`
          : "/api/routes",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": token,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Marşrut yadda saxlanılmadı."
        );
      }

      router.push("/routes");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Yadda saxlama xətası."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071120] px-4 py-6 text-white md:px-7">
      <div className="mx-auto max-w-[1650px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/routes"
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"
            >
              <ArrowLeft size={16} />
              Marşrut siyahısına qayıt
            </Link>

            <h1 className="text-2xl font-bold md:text-3xl">
              {editing
                ? "Marşrutu redaktə et"
                : "Yeni marşrut yarat"}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Yalnız bu marşrutun gediş və dönüş xətlərini
              redaktə et.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            <MapPin size={17} />
            Bakı · Xəritə redaktoru
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-white/10 bg-[#101c31]">
            <Loader2 className="animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
            <section className="space-y-5 rounded-2xl border border-white/10 bg-[#101c31] p-5">
              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Nəqliyyat operatoru
                </label>

                <select
                  value={form.operatorId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      operatorId: event.target.value,
                    }))
                  }
                  className={inputStyle}
                >
                  <option value="">Operator seç</option>

                  {operators.map((operator) => (
                    <option
                      key={operator.id}
                      value={operator.id}
                    >
                      {operator.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs text-slate-400">
                    Marşrut nömrəsi
                  </label>

                  <input
                    value={form.number}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        number: event.target.value,
                      }))
                    }
                    placeholder="TEST-01"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs text-slate-400">
                    Status
                  </label>

                  <select
                    value={form.isActive ? "active" : "inactive"}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        isActive: event.target.value === "active",
                      }))
                    }
                    className={inputStyle}
                  >
                    <option value="active">Aktiv</option>
                    <option value="inactive">Deaktiv</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Marşrut adı
                </label>

                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Marşrutun adı"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Başlanğıc məntəqəsi (A)
                </label>

                <input
                  value={form.from}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      from: event.target.value,
                    }))
                  }
                  placeholder="Başlanğıc"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Son məntəqə (B)
                </label>

                <input
                  value={form.to}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      to: event.target.value,
                    }))
                  }
                  placeholder="Son məntəqə"
                  className={inputStyle}
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ArrowLeftRight
                    size={17}
                    className="text-cyan-400"
                  />
                  İstiqamətlər
                </h2>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDirection("OUTBOUND")
                    }
                    className={`rounded-xl border p-3 text-sm ${
                      activeDirection === "OUTBOUND"
                        ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                        : "border-white/10 text-slate-400"
                    }`}
                  >
                    Gediş A → B
                    <div className="mt-1 text-xs">
                      {form.outbound.length} nöqtə
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveDirection("INBOUND")
                    }
                    className={`rounded-xl border p-3 text-sm ${
                      activeDirection === "INBOUND"
                        ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                        : "border-white/10 text-slate-400"
                    }`}
                  >
                    Dönüş B → A
                    <div className="mt-1 text-xs">
                      {form.inbound.length} nöqtə
                    </div>
                  </button>
                </div>

                <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs leading-5 text-slate-400">
                  Xəritədə çəkməni aktivləşdir və küçələr boyunca
                  nöqtələri ardıcıl əlavə et. Gediş və dönüş
                  ayrıca saxlanılacaq.
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDrawing((previous) => !previous)
                    }
                    className={`rounded-xl border px-2 py-3 text-xs ${
                      drawing
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                        : "border-white/10"
                    }`}
                  >
                    {drawing ? "Dayandır" : "Çəkməyə başla"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updatePoints((points) =>
                        points.slice(0, -1)
                      )
                    }
                    className="flex items-center justify-center gap-1 rounded-xl border border-white/10 px-2 py-3 text-xs"
                  >
                    <Undo2 size={14} />
                    Geri al
                  </button>

                  <button
                    type="button"
                    onClick={() => updatePoints(() => [])}
                    className="flex items-center justify-center gap-1 rounded-xl border border-rose-400/20 px-2 py-3 text-xs text-rose-400"
                  >
                    <Trash2 size={14} />
                    Sıfırla
                  </button>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <label className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck size={16} />
                  Developer token
                </label>

                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(event) =>
                    setToken(event.target.value)
                  }
                  placeholder="ADMIN_SETUP_TOKEN"
                  className={inputStyle}
                />
              </div>

              <button
                type="button"
                onClick={() => void saveRoute()}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-4 text-sm font-bold text-[#071120] hover:bg-cyan-300 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}
                {editing
                  ? "Dəyişiklikləri yadda saxla"
                  : "Marşrutu yarat"}
              </button>
            </section>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#101c31]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <h2 className="font-semibold">
                    Marşrut trayektoriyası
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Yalnız cari marşrut · Digər xətlər gizlidir
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    drawing
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-white/5 text-slate-400"
                  }`}
                >
                  {drawing
                    ? "Çəkmə aktivdir"
                    : "Baxış rejimi"}
                </span>
              </div>

              <div className="relative isolate h-[540px] overflow-hidden md:h-[740px]">
                <RouteMap
                  routes={[]}
                  selectedId=""
                  editing={true}
                  activeDirection={activeDirection}
                  draft={currentPoints}
                  otherDraft={otherPoints}
                  onAddPoint={(point) => {
                    if (drawing) addPoint(point);
                  }}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
