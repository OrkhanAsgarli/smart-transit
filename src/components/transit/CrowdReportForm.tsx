
"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Send,
  Users,
} from "lucide-react";

type OccupancyLevel = "LOW" | "MEDIUM" | "HIGH";

type Props = {
  busId: string;
  stopId?: string;
  busName?: string;
  onSubmitted?: () => void;
};

const options: {
  value: OccupancyLevel;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    value: "LOW",
    title: "Aşağı",
    description: "Boş yerlər var",
    color: "green",
  },
  {
    value: "MEDIUM",
    title: "Orta",
    description: "Qismən doludur",
    color: "yellow",
  },
  {
    value: "HIGH",
    title: "Yüksək",
    description: "Çox sıxdır",
    color: "red",
  },
];

export default function CrowdReportForm({
  busId,
  stopId,
  busName,
  onSubmitted,
}: Props) {
  const [level, setLevel] =
    useState<OccupancyLevel | null>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submitReport() {
    if (!level || loading) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/crowd-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          busId,
          stopId: stopId || null,
          level,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Bildiriş göndərilə bilmədi."
        );
      }

      setSuccess(true);
      setLevel(null);
      onSubmitted?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Naməlum xəta baş verdi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c31] p-5 text-white">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-400">
          <Users size={22} />
        </div>

        <div>
          <h3 className="text-lg font-semibold">
            Avtobusun doluluğunu bildir
          </h3>

          <p className="text-sm text-slate-400">
            {busName || "Seçilmiş avtobus"}
          </p>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-300">
        Hazırda avtobusun içərisində sıxlıq nə dərəcədədir?
      </p>

      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const selected = level === option.value;

          const colors = {
            green: selected
              ? "border-green-400 bg-green-400/15 text-green-300"
              : "border-white/10 bg-white/[0.03] text-slate-300",
            yellow: selected
              ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
              : "border-white/10 bg-white/[0.03] text-slate-300",
            red: selected
              ? "border-red-400 bg-red-400/15 text-red-300"
              : "border-white/10 bg-white/[0.03] text-slate-300",
          };

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setLevel(option.value);
                setSuccess(false);
                setError("");
              }}
              className={`rounded-xl border p-3 text-center transition-all hover:bg-white/10 ${
                colors[option.color as keyof typeof colors]
              }`}
            >
              <div className="text-sm font-semibold">
                {option.title}
              </div>

              <div className="mt-1 text-[11px] opacity-75">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!level || loading}
        onClick={submitReport}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-[#071120] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Göndərilir...
          </>
        ) : (
          <>
            <Send size={18} />
            Bildirişi göndər
          </>
        )}
      </button>

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-300">
          <CheckCircle2 size={18} />
          Bildiriş uğurla göndərildi!
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Yalnız öz müşahidənizə əsasən bildiriş göndərin.
        Bu məlumat sərnişinlərin paylaşdığı müşahidədir,
        avtomatik ölçülmüş sərnişin sayı deyil.
      </p>
    </div>
  );
}
