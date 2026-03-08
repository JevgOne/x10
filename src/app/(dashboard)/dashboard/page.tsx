"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, Phone, DollarSign, Clock } from "lucide-react";

interface Stats {
  contacts: number;
  deals: number;
  totalRevenue: number;
  calls: number;
  pendingCallbacks: number;
}

interface StageStats {
  stage: string;
  count: number;
}

const STAGE_LABELS: Record<string, string> = {
  novy: "Nový",
  kontaktovany: "Kontaktovaný",
  zajem: "Zájem",
  nabidka: "Nabídka",
  jednani: "Jednání",
  smlouva: "Smlouva",
  uzavreno: "Uzavřeno",
  ztraceno: "Ztraceno",
};

const STAGE_COLORS: Record<string, string> = {
  novy: "bg-blue-500",
  kontaktovany: "bg-cyan-500",
  zajem: "bg-yellow-500",
  nabidka: "bg-orange-500",
  jednani: "bg-purple-500",
  smlouva: "bg-indigo-500",
  uzavreno: "bg-green-500",
  ztraceno: "bg-red-500",
};

function formatCZK(amount: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setStageStats(d.stageStats || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-txt3">Načítání...</div>;
  if (!stats) return <div className="text-red">Chyba načítání dat</div>;

  const cards = [
    { label: "Kontakty", value: stats.contacts, icon: Users, color: "text-accent" },
    { label: "Obchody", value: stats.deals, icon: Briefcase, color: "text-green" },
    { label: "Tržby", value: formatCZK(stats.totalRevenue), icon: DollarSign, color: "text-yellow" },
    { label: "Hovory", value: stats.calls, icon: Phone, color: "text-purple" },
    { label: "Callbacky", value: stats.pendingCallbacks, icon: Clock, color: "text-red" },
  ];

  const totalContacts = stageStats.reduce((s, st) => s + st.count, 0) || 1;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-txt3">{c.label}</span>
              <c.icon size={16} className={c.color} />
            </div>
            <div className="text-xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline overview */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4">Pipeline</h2>
        <div className="space-y-3">
          {Object.entries(STAGE_LABELS).map(([key, label]) => {
            const st = stageStats.find((s) => s.stage === key);
            const cnt = st?.count || 0;
            const pct = (cnt / totalContacts) * 100;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-txt2 w-28 shrink-0">{label}</span>
                <div className="flex-1 bg-surface3 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STAGE_COLORS[key] || "bg-accent"} transition-all`}
                    style={{ width: `${Math.max(pct, cnt > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-txt3 w-8 text-right">{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
