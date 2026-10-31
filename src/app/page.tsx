"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  BusFront,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Command,
  Gauge,
  LayoutDashboard,
  MapPin,
  Menu,
  Navigation,
  Plus,
  Radio,
  RefreshCw,
  Route,
  Search,
  Send,
  ShieldCheck,
  TrendingDown,
  Users,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

type Role = "passenger" | "dispatcher" | "operator";
type Density = "low" | "medium" | "high";
type ReportType = "crowded" | "moderate" | "empty" | "delay";

interface TransitBus {
  id: string;
  route: string;
  direction: string;
  stop: string;
  occupancy: number;
  passengers: number;
  capacity: number;
  eta: number;
  progress: number;
  reports: number;
  status: "active" | "delayed";
}

interface CrowdReport {
  id: number;
  route: string;
  type: ReportType;
  message: string;
  time: string;
  trust: number;
}

const initialBuses: TransitBus[] = [
  {
    id: "BUS-1042", route: "65",
    direction: "28 May → Neftçilər",
    stop: "28 May", occupancy: 92,
    passengers: 83, capacity: 90,
    eta: 3, progress: 23, reports: 18,
    status: "active",
  },
  {
    id: "BUS-1088", route: "65",
    direction: "28 May → Neftçilər",
    stop: "Gənclik", occupancy: 38,
    passengers: 34, capacity: 90,
    eta: 8, progress: 57, reports: 12,
    status: "active",
  },
  {
    id: "BUS-2031", route: "18",
    direction: "Sahil → Həzi Aslanov",
    stop: "Sahil", occupancy: 75,
    passengers: 68, capacity: 90,
    eta: 5, progress: 42, reports: 23,
    status: "active",
  },
  {
    id: "BUS-3017", route: "88",
    direction: "20 Yanvar → Koroğlu",
    stop: "20 Yanvar", occupancy: 54,
    passengers: 49, capacity: 90,
    eta: 6, progress: 68, reports: 9,
    status: "delayed",
  },
  {
    id: "BUS-2055", route: "18",
    direction: "Sahil → Həzi Aslanov",
    stop: "Nərimanov", occupancy: 27,
    passengers: 24, capacity: 90,
    eta: 12, progress: 81, reports: 7,
    status: "active",
  },
];

const initialReports: CrowdReport[] = [
  { id: 1, route: "65", type: "crowded", message: "Avtobus çox doludur", time: "İndi", trust: 94 },
  { id: 2, route: "18", type: "moderate", message: "Orta sıxlıq müşahidə olunur", time: "2 dəq əvvəl", trust: 87 },
  { id: 3, route: "88", type: "delay", message: "Avtobus gecikir", time: "4 dəq əvvəl", trust: 79 },
  { id: 4, route: "65", type: "empty", message: "Növbəti avtobusda boş yerlər var", time: "6 dəq əvvəl", trust: 91 },
];

const roleInfo: Record<Role, { label: string; subtitle: string; icon: LucideIcon }> = {
  passenger: { label: "Sərnişin", subtitle: "Smart Journey", icon: Users },
  dispatcher: { label: "Dispetçer", subtitle: "Fleet Control", icon: Radio },
  operator: { label: "Operator", subtitle: "Transit Analytics", icon: BarChart3 },
};

function density(value: number): Density {
  return value >= 85 ? "high" : value >= 60 ? "medium" : "low";
}

function densityText(value: number) {
  if (value >= 85) return "Çox sıx";
  if (value >= 60) return "Orta sıxlıq";
  return "Boş yerlər var";
}

function densityStyle(value: number) {
  if (value >= 85) return "text-rose-400 bg-rose-400/10 border-rose-400/20";
  if (value >= 60) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
}

function densityBar(value: number) {
  return value >= 85 ? "bg-rose-400" : value >= 60 ? "bg-amber-400" : "bg-emerald-400";
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[22px] border border-white/[0.075] bg-[#101c31]/85 ${className}`}>
      {children}
    </section>
  );
}

function StatCard({
  icon: Icon, label, value, unit, footer, accent = "cyan",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  footer: string;
  accent?: "cyan" | "purple" | "green" | "orange";
}) {
  const colors = {
    cyan: "text-cyan-400 bg-cyan-400/10",
    purple: "text-violet-400 bg-violet-400/10",
    green: "text-emerald-400 bg-emerald-400/10",
    orange: "text-amber-400 bg-amber-400/10",
  };

  return (
    <Panel className="p-5 transition-colors hover:border-white/20">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-400">{label}</span>
        <span className={`rounded-xl p-2.5 ${colors[accent]}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[30px] font-semibold tracking-tight text-white">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      <p className="mt-2 text-xs text-slate-500">{footer}</p>
    </Panel>
  );
}

function Occupancy({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">Doluluq</span>
        <span className={`text-sm font-semibold ${
          value >= 85 ? "text-rose-400" : value >= 60 ? "text-amber-400" : "text-emerald-400"
        }`}>
          {value}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${densityBar(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function DemoMap({ buses, selectedRoute }: { buses: TransitBus[]; selectedRoute: string }) {
  const points = [
    { x: 23, y: 43 }, { x: 40, y: 28 }, { x: 59, y: 48 },
    { x: 72, y: 29 }, { x: 81, y: 67 }, { x: 43, y: 72 },
    { x: 29, y: 61 }, { x: 66, y: 76 },
  ];

  return (
    <div className="relative h-[340px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#091626] sm:h-[405px]">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(74,114,163,.18) 1px, transparent 1px), linear-gradient(90deg,rgba(74,114,163,.18) 1px,transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />

      <svg viewBox="0 0 900 480" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <path d="M-40 370 C150 300 170 420 335 310 S590 130 950 180" fill="none" stroke="#122940" strokeWidth="64" />
        <path d="M-40 370 C150 300 170 420 335 310 S590 130 950 180" fill="none" stroke="#263e58" strokeWidth="2" strokeDasharray="12 12" />
        <path d="M40 -40 L330 520 M430 -60 L600 540 M800 -50 L690 540" stroke="#193149" strokeWidth="26" fill="none" />
        <path d="M40 -40 L330 520 M430 -60 L600 540 M800 -50 L690 540" stroke="#2b4560" strokeWidth="1.5" strokeDasharray="8 10" fill="none" />
        <path d="M-40 185 C220 130 480 220 950 55" stroke="#18324d" strokeWidth="27" fill="none" />
        <path d="M-40 185 C220 130 480 220 950 55" stroke="#28465e" strokeWidth="1.5" strokeDasharray="8 12" fill="none" />
        <path d="M150 210 Q290 100 450 205 T755 290" fill="none" stroke="#22d3ee" strokeWidth="4" strokeDasharray="10 8" opacity=".65" />
        <circle cx="150" cy="210" r="7" fill="#22d3ee" />
        <circle cx="755" cy="290" r="7" fill="#22d3ee" />
      </svg>

      <span className="absolute left-[11%] top-[18%] text-[11px] font-semibold tracking-widest text-slate-500">28 MAY</span>
      <span className="absolute left-[52%] top-[16%] text-[11px] font-semibold tracking-widest text-slate-500">GƏNCLİK</span>
      <span className="absolute bottom-[19%] right-[12%] text-[11px] font-semibold tracking-widest text-slate-500">NƏRİMANOV</span>
      <span className="absolute bottom-[13%] left-[15%] text-[11px] font-semibold tracking-widest text-slate-500">SAHİL</span>

      {buses.filter((b) => selectedRoute === "all" || b.route === selectedRoute).map((bus, index) => {
        const point = points[index % points.length];
        return (
          <div
            key={bus.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
            style={{ left: `${point.x + (bus.progress % 7)}%`, top: `${point.y}%` }}
            title={`${bus.id}: ${bus.occupancy}% dolu`}
          >
            <div className="relative">
              <div className={`absolute -inset-2 rounded-full opacity-20 ${densityBar(bus.occupancy)} animate-ping`} />
              <div className={`relative flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1.5 text-xs font-bold text-white shadow-xl ${
                bus.occupancy >= 85 ? "bg-rose-500" : bus.occupancy >= 60 ? "bg-amber-500" : "bg-059669 bg-emerald-600"
              }`}>
                <BusFront size={13} /> {bus.route}
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1729]/95 px-3 py-2 text-[11px] text-slate-300">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        Simulyasiya aktivdir
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-4 rounded-xl border border-white/10 bg-[#0b1729]/95 px-3 py-2.5 text-[11px] text-slate-300 sm:right-auto">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Boş</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Orta</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Çox sıx</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [role, setRole] = useState<Role>("passenger");
  const [buses, setBuses] = useState<TransitBus[]>(initialBuses);
  const [reports, setReports] = useState<CrowdReport[]>(initialReports);
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [search, setSearch] = useState("");
  const [reportRoute, setReportRoute] = useState("65");
  const [reportType, setReportType] = useState<ReportType>("crowded");
  const [notification, setNotification] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simulation, setSimulation] = useState(true);
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    if (!simulation) return;
    const timer = setInterval(() => {
      setBuses((current) =>
        current.map((bus) => ({
          ...bus,
          progress: (bus.progress + 1) % 100,
          occupancy: Math.max(10, Math.min(100, bus.occupancy + (Math.random() > 0.5 ? 1 : -1))),
        }))
      );
    }, 4500);
    return () => clearInterval(timer);
  }, [simulation]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(""), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const routes = ["65", "18", "88"];

  const filteredBuses = useMemo(() =>
    buses.filter((bus) =>
      (selectedRoute === "all" || bus.route === selectedRoute) &&
      `${bus.id} ${bus.route} ${bus.direction}`.toLowerCase().includes(search.toLowerCase())
    ), [buses, selectedRoute, search]);

  const avgOccupancy = Math.round(buses.reduce((sum, b) => sum + b.occupancy, 0) / buses.length);
  const highDensityCount = buses.filter((b) => density(b.occupancy) === "high").length;

  const suggestedBus = [...buses]
    .filter((b) => b.route === "65" && b.occupancy < 85)
    .sort((a, b) => a.eta - b.eta)[0];

  const sendReport = () => {
    const messages: Record<ReportType, string> = {
      crowded: "Avtobus çox doludur",
      moderate: "Avtobusda orta sıxlıq var",
      empty: "Avtobusda boş yerlər var",
      delay: "Avtobus gecikir",
    };

    const next: CrowdReport = {
      id: Date.now(), route: reportRoute,
      type: reportType, message: messages[reportType],
      time: "İndi", trust: 50,
    };
    setReports((current) => [next, ...current].slice(0, 10));
    setBuses((current) =>
      current.map((bus) => bus.route === reportRoute
        ? {
            ...bus,
            reports: bus.reports + 1,
            // Demo üçün sərnişin bildirişinin təxmini təsiri.
            // Real sistemdə bu, etibarlılıq və sensor məlumatları ilə yoxlanmalıdır.
            occupancy: Math.max(0, Math.min(100, bus.occupancy +
              (reportType === "crowded" ? 3 : reportType === "empty" ? -3 : 0))),
          }
        : bus)
    );
    setNotification("Bildirişiniz qəbul edildi — demo simulyasiya yeniləndi.");
  };

  const dispatchBus = () => {
    if (dispatched) {
      setNotification("Ehtiyat avtobus artıq simulyasiyaya əlavə edilib.");
      return;
    }
    setBuses((current) => [
      ...current,
      {
        id: "BUS-EXTRA", route: "65",
        direction: "28 May → Neftçilər",
        stop: "28 May", occupancy: 12,
        passengers: 11, capacity: 90,
        eta: 4, progress: 12, reports: 0,
        status: "active",
      },
    ]);
    setDispatched(true);
    setNotification("Ehtiyat avtobus simulyasiyaya əlavə edildi.");
  };

  const sidebarItems: { key: Role; icon: LucideIcon; name: string }[] = [
    { key: "passenger", icon: Users, name: "Sərnişin paneli" },
    { key: "dispatcher", icon: Radio, name: "Dispetçer paneli" },
    { key: "operator", icon: BarChart3, name: "Operator paneli" },
  ];

  return (
    <div className="min-h-screen bg-[#071120] text-slate-100 [font-family:Arial,Helvetica,sans-serif]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(13,93,154,0.12),transparent_50%)]" />

      {notification && (
        <div className="fixed right-4 top-4 z-[100] flex max-w-sm items-center gap-2 rounded-2xl border border-cyan-400/25 bg-[#142b40] px-4 py-3 text-sm text-white shadow-2xl">
          <CheckCircle2 size={19} className="shrink-0 text-emerald-400" />
          {notification}
          <button onClick={() => setNotification("")} aria-label="Bağla"><X size={16} /></button>
        </div>
      )}

      <div className="relative flex min-h-screen">
        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            aria-label="Menyunu bağla"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-white/[0.07] bg-[#0b1729] p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
          <div className="mb-10 flex items-center gap-3 px-2 pt-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
              <BusFront size={25} className="text-white" />
            </div>
            <div>
              <h1 className="text-[19px] font-bold tracking-tight text-white">SmartTransit<span className="text-cyan-400">.</span></h1>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-500">CROWD INTELLIGENCE</p>
            </div>
          </div>

          <div className="mb-3 px-3 text-[10px] font-semibold tracking-[0.2em] text-slate-500">WORKSPACE</div>
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => { setRole(item.key); setSidebarOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-medium transition-all ${
                    role === item.key
                      ? "border border-cyan-400/15 bg-cyan-400/10 text-cyan-300"
                      : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                  {role === item.key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                </button>
              );
            })}
          </nav>

          <div className="my-7 border-t border-white/[0.07]" />
          <div className="mb-3 px-3 text-[10px] font-semibold tracking-[0.2em] text-slate-500">SYSTEM STATUS</div>

          <div className="space-y-4 px-3 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2"><Wifi size={15} /> Simulyasiya</span>
              <span className={simulation ? "text-emerald-400" : "text-slate-500"}>{simulation ? "Aktiv" : "Pauza"}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2"><BusFront size={15} /> Avtobuslar</span>
              <span className="font-medium text-white">{buses.length}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2"><Activity size={15} /> Bildirişlər</span>
              <span className="font-medium text-white">{reports.length}</span>
            </div>
          </div>

          <div className="mt-auto">
            <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#12364d] to-[#102038] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/15">
                <Zap size={19} className="text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold">Smart Intelligence</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Crowdsourcing və dinamik nəqliyyat qərarlarının demo mühərriki.
              </p>
            </div>
            <p className="mt-5 px-2 text-[11px] text-slate-600">SmartTransit MVP · v0.1</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-white/[0.07] bg-[#081323]/95 px-4 backdrop-blur-xl sm:px-7">
            <div className="flex items-center gap-3">
              <button className="text-slate-300 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Menyu">
                <Menu size={23} />
              </button>
              <div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <LayoutDashboard size={12} /> Workspace <span>/</span> {roleInfo[role].label}
                </div>
                <h2 className="mt-1 text-sm font-semibold text-white sm:text-base">{roleInfo[role].subtitle}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              <span className="hidden items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> DEMO MODE
              </span>
              <button
                onClick={() => setSimulation((v) => !v)}
                className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/5"
                title={simulation ? "Simulyasiyanı dayandır" : "Simulyasiyanı başlat"}
                aria-label="Simulyasiyanı dəyiş"
              >
                <RefreshCw size={18} className={simulation ? "text-cyan-400" : ""} />
              </button>
              <button
                onClick={() => setNotification("Bütün xəbərdarlıqlar əsas paneldə göstərilir.")}
                className="relative text-slate-400 hover:text-white"
                aria-label="Bildirişlər"
              >
                <Bell size={20} />
                {highDensityCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-400" />}
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold">
                ST
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-cyan-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                  SMART TRANSIT NETWORK
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[30px]">
                  {role === "passenger" ? "Səyahətini ağıllı planlaşdır" :
                   role === "dispatcher" ? "Nəqliyyat idarəetmə mərkəzi" :
                   "Nəqliyyat analitikası"}
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  {role === "passenger"
                    ? "Avtobusların doluluğunu yoxla, daha rahat marşrut seç və məlumat paylaş."
                    : role === "dispatcher"
                    ? "Sıxlıq göstəricilərini izlə və nəqliyyat axınını optimallaşdır."
                    : "Marşrut performansını və sərnişin tələbatını təhlil et."}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-400">
                <ShieldCheck size={15} className="text-cyan-400" />
                Simulyasiya məlumatları
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard icon={BusFront} label="Aktiv avtobuslar" value={buses.length} footer="Simulyasiya şəbəkəsində" accent="cyan" />
              <StatCard icon={Users} label="Orta doluluq" value={avgOccupancy} unit="%" footer="Bütün demo avtobuslarda" accent="purple" />
              <StatCard icon={Clock3} label="Orta ETA" value={(buses.reduce((s, b) => s + b.eta, 0) / buses.length).toFixed(1)} unit="dəq" footer="Təxmini gəliş göstəricisi" accent="green" />
              <StatCard icon={Activity} label="Sıxlıq xəbərdarlığı" value={highDensityCount} footer="85% və yuxarı doluluq" accent="orange" />
            </div>

            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
              <Panel className="p-4 sm:p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-white"><MapPin size={18} className="text-cyan-400" /> Canlı nəqliyyat xəritəsi</h3>
                    <p className="mt-1 text-xs text-slate-500">Avtobusların simulyasiya olunmuş mövqeləri</p>
                  </div>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#17263c] px-3 py-2 text-xs text-white outline-none"
                    aria-label="Marşrut seç"
                  >
                    <option value="all">Bütün marşrutlar</option>
                    {routes.map((r) => <option key={r} value={r}>Marşrut {r}</option>)}
                  </select>
                </div>
                <DemoMap buses={buses} selectedRoute={selectedRoute} />
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-2"><Navigation size={14} /> Bakı · Nümunə marşrutlar</span>
                  <span>{filteredBuses.length} avtobus</span>
                </div>
              </Panel>

              <Panel className="flex flex-col p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Crowdsourcing Engine</h3>
                    <p className="mt-1 text-xs text-slate-500">İcma tərəfindən göndərilən məlumatlar</p>
                  </div>
                  <div className="rounded-xl bg-violet-400/10 p-2.5 text-violet-400"><Users size={19} /></div>
                </div>

                {role === "passenger" && (
                  <div className="mb-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.045] p-4">
                    <h4 className="mb-3 text-sm font-semibold">Sıxlıq barədə məlumat göndər</h4>
                    <label className="mb-1.5 block text-xs text-slate-400">Marşrut</label>
                    <select
                      value={reportRoute}
                      onChange={(e) => setReportRoute(e.target.value)}
                      className="mb-3 w-full rounded-xl border border-white/10 bg-[#182941] p-2.5 text-sm text-white outline-none"
                    >
                      {routes.map((r) => <option key={r} value={r}>Marşrut {r}</option>)}
                    </select>

                    <div className="mb-4 grid grid-cols-2 gap-2">
                      {([
                        ["crowded", "Çox sıx", "🔴"],
                        ["moderate", "Orta sıxlıq", "🟡"],
                        ["empty", "Boşdur", "🟢"],
                        ["delay", "Gecikmə", "⏱️"],
                      ] as const).map(([value, label, emoji]) => (
                        <button
                          key={value}
                          onClick={() => setReportType(value)}
                          className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                            reportType === value
                              ? "border-cyan-400/60 bg-cyan-400/10 text-white"
                              : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/25"
                          }`}
                        >
                          <span className="mr-1.5">{emoji}</span>{label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={sendReport}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-bold text-[#071322] transition-colors hover:bg-cyan-300"
                    >
                      <Send size={16} /> Məlumat göndər
                    </button>
                    <p className="mt-2 text-center text-[10px] text-slate-500">Demo rejimində bildiriş avtomatik əlavə olunur</p>
                  </div>
                )}

                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Son bildirişlər</h4>
                  <span className="text-[11px] text-cyan-400">{reports.length} qeyd</span>
                </div>

                <div className="max-h-[350px] flex-1 space-y-2 overflow-auto pr-1">
                  {reports.map((report) => (
                    <div key={report.id} className="rounded-xl border border-white/[0.055] bg-white/[0.025] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-white/[0.07] px-2 py-1 text-[11px] font-bold text-white">{report.route}</span>
                        <span className="text-[10px] text-slate-500">{report.time}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-200">{report.message}</p>
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                        <ShieldCheck size={12} className="text-cyan-400" />
                        Demo etibarlılıq göstəricisi: {report.trust}%
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {role === "passenger" && (
              <Panel className="overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold"><Route size={18} className="text-cyan-400" /> Ağıllı marşrut tövsiyəsi</h3>
                    <p className="mt-1 text-xs text-slate-500">Gəliş vaxtı ilə doluluğu birlikdə qiymətləndiririk</p>
                  </div>
                  <span className="w-fit rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-300">SMART ETA</span>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <div className="rounded-2xl bg-white/[0.035] p-4">
                    <p className="text-xs text-slate-500">Ən yaxın 65 nömrəli avtobus</p>
                    <p className="mt-2 text-2xl font-bold">3 <span className="text-sm font-normal text-slate-400">dəqiqə</span></p>
                    <p className="mt-2 text-xs text-rose-400">Gələcək, lakin çox dolu ola bilər</p>
                  </div>
                  <ArrowRight className="hidden text-cyan-400 md:block" size={20} />
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.055] p-4">
                    <p className="text-xs text-emerald-400">Tövsiyə olunan minmə vaxtı</p>
                    <p className="mt-2 text-2xl font-bold">
                      {suggestedBus ? suggestedBus.eta : "—"} <span className="text-sm font-normal text-slate-400">dəqiqə</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-400">{suggestedBus ? `${suggestedBus.id} · ${suggestedBus.occupancy}% dolu` : "Uyğun avtobus tapılmadı"}</p>
                  </div>
                </div>
              </Panel>
            )}

            {role === "dispatcher" && (
              <Panel className="overflow-hidden border-amber-400/20">
                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-amber-400/10 p-3 text-amber-400"><Zap size={22} /></div>
                    <div>
                      <h3 className="font-semibold">Smart Dispatch Recommendation</h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                        {highDensityCount > 0
                          ? "Sistemdə yüksək doluluq aşkar edilib. 65 nömrəli marşrutda ehtiyat avtobusun göndərilməsi qiymətləndirilə bilər."
                          : "Hazırda kritik doluluq aşkarlanmayıb. Nəqliyyat şəbəkəsini izləməyə davam edin."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={dispatchBus}
                    disabled={dispatched}
                    className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#071322] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {dispatched ? <CheckCircle2 size={17} /> : <Plus size={17} />}
                    {dispatched ? "Avtobus əlavə edildi" : "Ehtiyat avtobus göndər"}
                  </button>
                </div>
              </Panel>
            )}

            {role === "operator" && (
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel className="p-5">
                  <h3 className="mb-6 flex items-center gap-2 font-semibold"><Gauge size={18} className="text-cyan-400" /> Marşrut doluluğu</h3>
                  <div className="space-y-6">
                    {routes.map((r) => {
                      const list = buses.filter((b) => b.route === r);
                      const avg = Math.round(list.reduce((s, b) => s + b.occupancy, 0) / list.length);
                      return (
                        <div key={r}>
                          <div className="mb-2 flex justify-between text-sm">
                            <span>Marşrut {r}</span><span className="text-slate-400">{avg}%</span>
                          </div>
                          <div className="h-3 rounded-full bg-white/[0.07]">
                            <div className={`h-full rounded-full transition-all duration-500 ${densityBar(avg)}`} style={{ width: `${avg}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
                <Panel className="p-5">
                  <h3 className="mb-6 flex items-center gap-2 font-semibold"><TrendingDown size={18} className="text-emerald-400" /> Əməliyyat göstəriciləri</h3>
                  <div className="space-y-4">
                    {[
                      ["Ümumi avtobus tutumu", buses.reduce((s, b) => s + b.capacity, 0)],
                      ["Təxmini sərnişin sayı", buses.reduce((s, b) => s + Math.round(b.capacity * b.occupancy / 100), 0)],
                      ["İcma bildirişləri", reports.length],
                      ["İzlənilən marşrutlar", routes.length],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between border-b border-white/[0.055] pb-3 text-sm">
                        <span className="text-slate-400">{label}</span>
                        <span className="font-semibold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            )}

            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold"><BusFront size={18} className="text-cyan-400" /> Avtobus monitorinqi</h3>
                  <p className="mt-1 text-xs text-slate-500">Marşrutlar, doluluq və təxmini gəliş vaxtları</p>
                </div>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Marşrut və ya avtobus axtar..."
                    className="w-full rounded-xl border border-white/10 bg-[#16253a] py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40 sm:w-64"
                  />
                </div>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredBuses.map((bus) => (
                  <div key={bus.id} className="rounded-2xl border border-white/[0.08] bg-[#0c192b] p-4 transition-all hover:border-cyan-400/25">
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-lg font-bold text-cyan-400">
                          {bus.route}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{bus.id}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{bus.direction}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] ${densityStyle(bus.occupancy)}`}>{densityText(bus.occupancy)}</span>
                    </div>
                    <Occupancy value={bus.occupancy} />
                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400"><MapPin size={13} /> {bus.stop}</span>
                      <span className="flex items-center gap-1.5 font-semibold text-cyan-400"><Clock3 size={13} /> {bus.eta} dəq</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><Users size={12} /> ~{Math.round(bus.capacity * bus.occupancy / 100)} / {bus.capacity}</span>
                      <span>{bus.reports} icma rəyi</span>
                    </div>
                  </div>
                ))}
                {filteredBuses.length === 0 && (
                  <div className="col-span-full py-12 text-center text-sm text-slate-400">Uyğun avtobus tapılmadı.</div>
                )}
              </div>
            </Panel>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pb-3 pt-5 text-[11px] text-slate-500">
              <span>© SmartTransit · Smart Transit & Crowdsourcing Engine</span>
              <span className="flex items-center gap-2"><Command size={13} /> Prototype · Demo data only</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
