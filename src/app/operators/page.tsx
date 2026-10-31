
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  BusFront,
  CheckCircle2,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Operator = {
  id: string;
  name: string;
  code: string;
  website: string | null;
  createdAt: string;
  _count: {
    routes: number;
    buses: number;
    users: number;
  };
};

type FormData = {
  name: string;
  code: string;
  website: string;
};

const emptyForm: FormData = {
  name: "",
  code: "",
  website: "",
};

const field =
  "w-full rounded-xl border border-white/10 bg-[#14233a] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50";

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [token, setToken] = useState("");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOperators = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/operators", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Yüklənmə xətası");
      }

      setOperators(result.operators);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bağlantı xətası"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOperators();
  }, [loadOperators]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(op: Operator) {
    setEditingId(op.id);
    setForm({
      name: op.name,
      code: op.code,
      website: op.website || "",
    });
    setError("");
    setModalOpen(true);
  }

  async function saveOperator(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token.trim()) {
      setError("Əvvəl developer tokenini daxil et.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const url = editingId
        ? `/api/operators/${editingId}`
        : "/api/operators";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Əməliyyat alınmadı");
      }

      setModalOpen(false);
      setMessage(
        editingId
          ? "Operator uğurla yeniləndi."
          : "Yeni operator uğurla əlavə edildi."
      );

      await loadOperators();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Xəta baş verdi"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOperator(op: Operator) {
    if (!token.trim()) {
      setError("Əvvəl developer tokenini daxil et.");
      return;
    }

    const confirmed = window.confirm(
      `"${op.name}" operatorunu silmək istəyirsən?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/operators/${op.id}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Silinmə alınmadı");
      }

      setMessage("Operator silindi.");
      await loadOperators();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Xəta baş verdi"
      );
    }
  }

  const filtered = operators.filter((op) =>
    `${op.name} ${op.code}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const routeCount = operators.reduce(
    (sum, op) => sum + op._count.routes, 0
  );
  const busCount = operators.reduce(
    (sum, op) => sum + op._count.buses, 0
  );

  return (
    <main className="min-h-screen bg-[#071120] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400"
            >
              <ArrowLeft size={17} />
              Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-400">
                <Building2 size={25} />
              </span>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">
                  Operator Management
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Smart Transit · Nəqliyyat operatorları
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#071120] hover:bg-cyan-300"
          >
            <Plus size={18} />
            Yeni operator
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Operatorlar",
              value: operators.length,
              icon: Building2,
            },
            {
              title: "Marşrutlar",
              value: routeCount,
              icon: Route,
            },
            {
              title: "Avtobuslar",
              value: busCount,
              icon: BusFront,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-white/10 bg-[#101c31] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {card.title}
                  </span>
                  <Icon size={20} className="text-cyan-400" />
                </div>
                <div className="mt-4 text-3xl font-bold">
                  {card.value}
                </div>
              </div>
            );
          })}
        </div>

        <section className="rounded-2xl border border-cyan-400/15 bg-[#101c31] p-4">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound size={18} className="text-cyan-400" />
            <h2 className="text-sm font-semibold">
              Lokal developer icazəsi
            </h2>
          </div>
          <p className="mb-3 text-xs leading-5 text-slate-400">
            Operator əlavə etmək, yeniləmək və silmək üçün
            .env faylındakı ADMIN_SETUP_TOKEN dəyərini daxil et.
            Token yalnız bu səhifənin müvəqqəti yaddaşında
            saxlanılır.
          </p>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Developer token"
            aria-label="Developer token"
            className={field}
          />
        </section>

        {message && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
          >
            <CheckCircle2 size={18} />
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

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#101c31]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
            <div>
              <h2 className="font-semibold">Qeydiyyatlı operatorlar</h2>
              <p className="mt-1 text-xs text-slate-500">
                PostgreSQL verilənlər bazasından yüklənir
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Operator axtar..."
                  className={`${field} w-48 pl-9 sm:w-64`}
                />
              </div>
              <button
                onClick={() => void loadOperators()}
                aria-label="Yenilə"
                className="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-white"
              >
                <RefreshCw size={17} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-cyan-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Building2
                size={42}
                className="mx-auto mb-4 text-slate-600"
              />
              <h3 className="font-semibold">
                Operator tapılmadı
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                İlk operatoru əlavə edərək başla.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((op) => (
                <article
                  key={op.id}
                  className="rounded-2xl border border-white/10 bg-[#0b1729] p-5 transition hover:border-cyan-400/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-400">
                      <Building2 size={23} />
                    </div>
                    <span className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-400">
                      Qeydiyyatlı
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    {op.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Kod: {op.code}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2 border-y border-white/10 py-4 text-center">
                    {[
                      { value: op._count.routes, icon: Route, label: "Marşrut" },
                      { value: op._count.buses, icon: BusFront, label: "Avtobus" },
                      { value: op._count.users, icon: Users, label: "İşçi" },
                    ].map((metric) => {
                      const Icon = metric.icon;
                      return (
                        <div key={metric.label}>
                          <Icon
                            size={16}
                            className="mx-auto mb-2 text-slate-500"
                          />
                          <p className="font-bold">{metric.value}</p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {metric.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {op.website && (
                    <a
                      href={op.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block truncate text-xs text-cyan-400 hover:underline"
                    >
                      {op.website}
                    </a>
                  )}

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => openEdit(op)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs hover:bg-white/5"
                    >
                      <Pencil size={15} />
                      Redaktə
                    </button>
                    <button
                      onClick={() => void deleteOperator(op)}
                      className="rounded-xl border border-rose-400/15 px-3 py-2.5 text-rose-400 hover:bg-rose-400/10"
                      aria-label={`${op.name} sil`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={15} />
          Smart Transit · Operator Registry · PostgreSQL
        </footer>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#101c31] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Operatoru redaktə et"
                    : "Yeni operator"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Məlumatlar PostgreSQL-də saxlanılacaq
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Bağla"
              >
                <X size={21} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={saveOperator} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Operator adı
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Məsələn: Demo Transit"
                  className={field}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Operator kodu
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={30}
                  value={form.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="DEMO_TRANSIT"
                  className={field}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-slate-400">
                  Veb sayt (istəyə bağlı)
                </label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) =>
                    setForm({ ...form, website: e.target.value })
                  }
                  placeholder="https://example.com"
                  className={field}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 p-3 text-sm"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 p-3 text-sm font-bold text-[#071120] disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Yadda saxla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
