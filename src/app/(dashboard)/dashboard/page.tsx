"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, Phone, TrendingUp, Clock, Database, FileText, FolderOpen, ArrowUpRight } from "lucide-react";

interface Stats {
  contacts: number;
  deals: number;
  totalRevenue: number;
  calls: number;
  pendingCallbacks: number;
  databases: number;
  documents: number;
  projects: number;
}

interface StageStats {
  stage: string;
  count: number;
}

interface CallStats {
  result: string;
  count: number;
}

interface HotColdStats {
  hotCold: string;
  count: number;
}

interface TopAgent {
  agentName: string;
  dealCount: number;
  totalAmount: number;
}

interface RecentContact {
  id: string;
  firstName: string;
  lastName: string;
  pipelineStage: string;
  potentialValue: number;
  projectName: string;
}

interface RecentDeal {
  id: string;
  amount: number;
  product: string;
  contactFirstName: string;
  contactLastName: string;
  projectName: string;
  agentName: string;
}

interface RecentCall {
  id: string;
  date: string;
  time: string;
  duration: number;
  result: string;
  type: string;
  contactFirstName: string;
  contactLastName: string;
}

const STAGE_LABELS: Record<string, string> = {
  novy: "Novy", kontaktovany: "Kontaktovany", zajem: "Zajem", nabidka: "Nabidka",
  jednani: "Jednani", smlouva: "Smlouva", uzavreno: "Uzavreno", ztraceno: "Ztraceno",
};

const STAGE_BAR_COLORS: Record<string, string> = {
  novy: "bg-blue-500", kontaktovany: "bg-cyan-500", zajem: "bg-yellow-500",
  nabidka: "bg-orange-500", jednani: "bg-purple-500", smlouva: "bg-indigo-500",
  uzavreno: "bg-green-500", ztraceno: "bg-red-500",
};

const RESULT_LABELS: Record<string, string> = {
  answered: "Zvedl", not_answered: "Nezvedl", busy: "Obsazeno",
  voicemail: "Hlasovka", callback: "Callback", interested: "Zajem",
  not_interested: "Bez zajmu", deal: "Obchod",
};

const RESULT_COLORS: Record<string, string> = {
  answered: "bg-green-500", not_answered: "bg-red-500", busy: "bg-yellow-500",
  voicemail: "bg-purple-500", callback: "bg-blue-500", interested: "bg-emerald-500",
  not_interested: "bg-orange-500", deal: "bg-cyan-500",
};

function formatCZK(amount: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [callStats, setCallStats] = useState<CallStats[]>([]);
  const [hotColdStats, setHotColdStats] = useState<HotColdStats[]>([]);
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setStageStats(d.stageStats || []);
        setCallStats(d.callStats || []);
        setHotColdStats(d.hotColdStats || []);
        setTopAgents(d.topAgents || []);
        setRecentContacts(d.recentContacts || []);
        setRecentDeals(d.recentDeals || []);
        setRecentCalls(d.recentCalls || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!stats) return <div className="text-red">Chyba nacitani dat</div>;

  const cards = [
    { label: "Kontakty", value: stats.contacts, icon: Users, cls: "stat-blue", iconColor: "text-accent" },
    { label: "Obchody", value: stats.deals, icon: Briefcase, cls: "stat-green", iconColor: "text-green" },
    { label: "Trzby", value: formatCZK(stats.totalRevenue), icon: TrendingUp, cls: "stat-yellow", iconColor: "text-yellow" },
    { label: "Hovory", value: stats.calls, icon: Phone, cls: "stat-purple", iconColor: "text-purple" },
    { label: "Callbacky", value: stats.pendingCallbacks, icon: Clock, cls: "stat-red", iconColor: "text-red" },
    { label: "Projekty", value: stats.projects, icon: FolderOpen, cls: "stat-blue", iconColor: "text-accent" },
    { label: "Databaze", value: stats.databases, icon: Database, cls: "stat-green", iconColor: "text-green" },
    { label: "Dokumenty", value: stats.documents, icon: FileText, cls: "stat-purple", iconColor: "text-purple" },
  ];

  const totalContacts = stageStats.reduce((s, st) => s + st.count, 0) || 1;
  const totalCalls = callStats.reduce((s, st) => s + st.count, 0) || 1;
  const totalHotCold = hotColdStats.reduce((s, st) => s + st.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`${c.cls} glass rounded-2xl border p-5 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-txt3 uppercase tracking-wider">{c.label}</span>
              <div className={`w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center ${c.iconColor}`}>
                <c.icon size={15} />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline + Call stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline overview */}
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold">Pipeline prehled</h2>
            <span className="text-[10px] font-mono text-txt3">{totalContacts} kontaktu</span>
          </div>
          <div className="space-y-3">
            {Object.entries(STAGE_LABELS).map(([key, label]) => {
              const st = stageStats.find((s) => s.stage === key);
              const cnt = st?.count || 0;
              const pct = (cnt / totalContacts) * 100;
              return (
                <div key={key} className="flex items-center gap-3 group">
                  <span className="text-xs text-txt2 w-28 shrink-0 group-hover:text-txt transition-colors">{label}</span>
                  <div className="flex-1 bg-surface3/50 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STAGE_BAR_COLORS[key]} transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(pct, cnt > 0 ? 4 : 0)}%` }}
                    >
                      {pct > 10 && <span className="text-[9px] font-bold text-white">{Math.round(pct)}%</span>}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-txt3 w-8 text-right">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call result stats */}
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold">Vysledky hovoru</h2>
            <span className="text-[10px] font-mono text-txt3">{totalCalls} hovoru</span>
          </div>
          {callStats.length === 0 ? (
            <p className="text-sm text-txt3">Zadne hovory</p>
          ) : (
            <>
              {/* Bar */}
              <div className="flex rounded-lg overflow-hidden h-8 mb-4">
                {callStats.map((cs) => {
                  const pct = (cs.count / totalCalls) * 100;
                  return (
                    <div
                      key={cs.result}
                      className={`${RESULT_COLORS[cs.result] || "bg-gray-500"} flex items-center justify-center transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${RESULT_LABELS[cs.result] || cs.result}: ${cs.count}`}
                    >
                      {pct > 8 && <span className="text-[9px] font-bold text-white">{Math.round(pct)}%</span>}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2">
                {callStats.map((cs) => (
                  <div key={cs.result} className="flex items-center gap-2 text-xs">
                    <div className={`w-2.5 h-2.5 rounded-full ${RESULT_COLORS[cs.result] || "bg-gray-500"}`} />
                    <span className="text-txt2">{RESULT_LABELS[cs.result] || cs.result}</span>
                    <span className="text-txt3 font-mono ml-auto">{cs.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hot/Cold + Top Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hot/Cold distribution */}
        <div className="glass rounded-2xl border border-border p-6">
          <h2 className="text-sm font-bold mb-5">Distribuce kontaktu</h2>
          <div className="flex gap-4">
            {["hot", "warm", "cold"].map((key) => {
              const st = hotColdStats.find((s) => s.hotCold === key);
              const cnt = st?.count || 0;
              const pct = (cnt / totalHotCold) * 100;
              const colors: Record<string, { bg: string; text: string; label: string }> = {
                hot: { bg: "bg-red/10", text: "text-red", label: "HOT" },
                warm: { bg: "bg-yellow/10", text: "text-yellow", label: "WARM" },
                cold: { bg: "bg-blue-500/10", text: "text-blue-400", label: "COLD" },
              };
              const c = colors[key];
              return (
                <div key={key} className={`flex-1 ${c.bg} rounded-2xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${c.text}`}>{cnt}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${c.text} mt-1`}>{c.label}</div>
                  <div className="text-[10px] text-txt3 mt-1">{Math.round(pct)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top agents */}
        <div className="glass rounded-2xl border border-border p-6">
          <h2 className="text-sm font-bold mb-4">Top agenti</h2>
          {topAgents.length === 0 ? (
            <p className="text-sm text-txt3">Zadni agenti</p>
          ) : (
            <div className="space-y-3">
              {topAgents.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-xs font-bold text-accent">
                    {a.agentName?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.agentName || "—"}</div>
                    <div className="text-[10px] text-txt3">{a.dealCount} obchodu</div>
                  </div>
                  <span className="text-sm font-mono text-green">{formatCZK(Number(a.totalAmount) || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent contacts */}
        <div className="glass rounded-2xl border border-border p-5">
          <h3 className="text-sm font-bold mb-4">Posledni kontakty</h3>
          {recentContacts.length === 0 ? (
            <p className="text-sm text-txt3">Zadne kontakty</p>
          ) : (
            <div className="space-y-2">
              {recentContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                      {c.firstName?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.firstName} {c.lastName}</div>
                      <div className="text-[10px] text-txt3">{c.projectName || STAGE_LABELS[c.pipelineStage] || c.pipelineStage}</div>
                    </div>
                  </div>
                  {c.potentialValue > 0 && (
                    <span className="text-[10px] font-mono text-green shrink-0 ml-2">{formatCZK(c.potentialValue)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent deals */}
        <div className="glass rounded-2xl border border-border p-5">
          <h3 className="text-sm font-bold mb-4">Posledni obchody</h3>
          {recentDeals.length === 0 ? (
            <p className="text-sm text-txt3">Zadne obchody</p>
          ) : (
            <div className="space-y-2">
              {recentDeals.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green/20 to-cyan/20 flex items-center justify-center shrink-0">
                      <TrendingUp size={12} className="text-green" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {d.contactFirstName || d.contactLastName
                          ? `${d.contactFirstName || ""} ${d.contactLastName || ""}`.trim()
                          : d.product || "—"}
                      </div>
                      <div className="text-[10px] text-txt3">{d.projectName || d.product}</div>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-green shrink-0 ml-2">{formatCZK(d.amount || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent calls */}
        <div className="glass rounded-2xl border border-border p-5">
          <h3 className="text-sm font-bold mb-4">Posledni hovory</h3>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-txt3">Zadne hovory</p>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      ["answered", "interested", "deal"].includes(c.result) ? "bg-green/10" : "bg-red/10"
                    }`}>
                      <Phone size={12} className={["answered", "interested", "deal"].includes(c.result) ? "text-green" : "text-red"} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.contactFirstName || c.contactLastName
                          ? `${c.contactFirstName || ""} ${c.contactLastName || ""}`.trim()
                          : "—"}
                      </div>
                      <div className="text-[10px] text-txt3">{RESULT_LABELS[c.result] || c.result} &middot; {formatDuration(c.duration)}</div>
                    </div>
                  </div>
                  {c.date && (
                    <span className="text-[10px] text-txt3 shrink-0 ml-2">{new Date(c.date).toLocaleDateString("cs-CZ")}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
