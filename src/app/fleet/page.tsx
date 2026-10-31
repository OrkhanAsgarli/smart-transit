
"use client";

import dynamic from "next/dynamic";

const FleetWorkspace = dynamic(
  () => import("@/components/transit/FleetWorkspace"),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center bg-[#071120] text-cyan-400">
        Bakı xəritəsi yüklənir...
      </main>
    ),
  }
);

export default function FleetPage() {
  return <FleetWorkspace />;
}
