
"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  RefreshCw,
} from "lucide-react";

type Action = {
  id: string;
  status: string;
  reason: string;
  notes: string | null;
  routeId: string;
  busId: string | null;
  createdAt: string;
};

type Detection = {
  detected: boolean;
  reason: string;
  evidence: {
    total: number;
    high: number;
    highPercent: number;
    distinctUsers: number;
    spanMinutes: number;
  };
};

export default function AnomalyAlerts() {
  const [actions, setActions] = useState<Action[]>([]);
  const [demo, setDemo] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const response = await fetch(
        "/api/operator/anomalies",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Xəbərdarlıqlar yüklənmədi.");
      }

      const data = await response.json();
      setActions(data.actions ?? []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Bağlantı xətası."
      );
    }
  }

  useEffect(() => {
    void refresh();

    const interval = setInterval(() => {
      void refresh();
    }, 10_000);

    return () => clearInterval(interval);
  }, []);

  async function runDemo() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/operator/anomalies?demo=true",
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Demo sınağı alınmadı."
        );
      }

      setDemo(data.scenarios.sustainedHigh);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Demo xətası."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-[#101c31] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={20}
              className="text-amber-400"
            />
            <h2 className="text-lg font-semibold">
              Anomaly Detection
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Davamlı yüksək sıxlıq və ehtiyat avtobus
            tövsiyələri
          </p>
        </div>

        <button
          type="button"
          onClick={runDemo}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 disabled:opacity-50"
        >
          <FlaskConical size={16} />
          {loading ? "Yoxlanılır..." : "10 dəqiqəlik demo"}
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {demo && (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/[0.06] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-300">
            <FlaskConical size={17} />
            SİNTETİK DEMO — REAL XƏBƏRDARLIQ DEYİL
          </div>

          <div className="flex items-center gap-2 text-sm">
            {demo.detected ? (
              <CheckCircle2
                size={18}
                className="text-green-400"
              />
            ) : (
              <AlertTriangle
                size={18}
                className="text-amber-400"
              />
            )}

            {demo.detected
              ? "Yüksək sıxlıq aşkarlandı"
              : "Anomaliya aşkarlanmadı"}
          </div>

          <p className="mt-3 text-sm text-slate-300">
            {demo.reason}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white/5 p-3">
              <div className="text-lg font-bold">
                {demo.evidence.highPercent}%
              </div>
              HIGH
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <div className="text-lg font-bold">
                {demo.evidence.spanMinutes}
              </div>
              dəqiqə
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <div className="text-lg font-bold">
                {demo.evidence.distinctUsers}
              </div>
              istifadəçi
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Bu ssenari məlumat bazasına yazılmır və
            real avtobus göndərişi yaratmır.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Saxlanılmış dispatch tövsiyələri
        </h3>

        <button
          type="button"
          onClick={() => void refresh()}
          className="text-slate-400 hover:text-white"
          aria-label="Xəbərdarlıqları yenilə"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
          Hələlik təsdiqlənmiş şərtlərə uyğun
          avtomatik tövsiyə yoxdur.
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4"
            >
              <div className="flex justify-between gap-3">
                <span className="text-xs font-semibold text-amber-300">
                  {action.status}
                </span>

                <span className="text-xs text-slate-500">
                  {new Date(
                    action.createdAt
                  ).toLocaleString("az-AZ")}
                </span>
              </div>

              <p className="mt-2 text-sm text-white">
                {action.reason}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Marşrut ID: {action.routeId}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
