"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3, Download, ChevronDown, Phone, Handshake, TrendingUp,
  Clock, Users, Filter, X,
} from "lucide-react";

interface AgentCallStats {
  agentId: string; agentName: string; totalCalls: number; totalDuration: number;
  answered: number; interested: number; deals: number; notAnswered: number;
}
interface AgentDealStats {
  agentId: string; agentName: string; dealCount: number; totalAmount: number;
  commAgent: number; commSupervisor: number; commCompany: number;
}
interface ResultStat { result: string; count: number; }
interface DateStat { date: string; count: number; }
interface FunnelStat { stage: string; count: number; }
interface ProjectDealStat { projectName: string; dealCount: number; totalAmount: number; }
interface DailyDealStat { date: string; count: number; totalAmount: number; }
interface UserOption { id: string; name: string; }
interface ProjectOption { id: string; name: string; }

const RESULT_LABELS: Record<string, string> = {
  answered: "Zvedl", not_answered: "Nezvedl", busy: "Obsazeno", voicemail: "Hlasovka",
  callback: "Callback", interested: "Zájem", not_interested: "Bez zájmu", deal: "Obchod",
};
const RESULT_COLORS: Record<string, string> = {
  answered: "bg-green/60", not_answered: "bg-red/60", busy: "bg-yellow/60", voicemail: "bg-purple/60",
  callback: "bg-accent/60", interested: "bg-emerald-500/60", not_interested: "bg-orange-500/60", deal: "bg-cyan-500/60",
};
const STAGE_LABELS: Record<string, string> = {
  novy: "Nový", kontaktovany: "Kontaktovaný", zajem: "Zájem", nabidka: "Nabídka",
  jednani: "Jednání", smlouva: "Smlouva", uzavreno: "Uzavřeno", ztraceno: "Ztraceno",
};
const STAGE_ORDER = ["novy", "kontaktovany", "zajem", "nabidka", "jednani", "smlouva", "uzavreno", "ztraceno"];

function formatCZK(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
}
function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type Preset = "today" | "week" | "month" | "quarter" | "custom";

function getDateRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  const d = new Date(now);
  switch (preset) {
    case "today": return { from: to, to };
    case "week": { d.setDate(d.getDate() - 7); return { from: d.toISOString().split("T")[0], to }; }
    case "month": { d.setMonth(d.getMonth() - 1); return { from: d.toISOString().split("T")[0], to }; }
    case "quarter": { d.setMonth(d.getMonth() - 3); return { from: d.toISOString().split("T")[0], to }; }
    default: return { from: "", to: "" };
  }
}

export default function ReportsPage() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterProject, setFilterProject] = useState("");

  // Options
  const [agents, setAgents] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Data
  const [agentCalls, setAgentCalls] = useState<AgentCallStats[]>([]);
  const [agentDeals, setAgentDeals] = useState<AgentDealStats[]>([]);
  const [callsByResult, setCallsByResult] = useState<ResultStat[]>([]);
  const [callsByDate, setCallsByDate] = useState<DateStat[]>([]);
  const [funnelStages, setFunnelStages] = useState<FunnelStat[]>([]);
  const [dealsByProject, setDealsByProject] = useState<ProjectDealStat[]>([]);
  const [dailyDeals, setDailyDeals] = useState<DailyDealStat[]>([]);

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  // Auth + options
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {});
    fetch("/api/users").then(r => r.ok ? r.json() : { users: [] }).then(d => setAgents((d.users || []).filter((u: { role: string }) => u.role !== "admin"))).catch(() => {});
    fetch("/api/projects").then(r => r.ok ? r.json() : { projects: [] }).then(d => setProjects(d.projects || [])).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const range = preset === "custom" ? { from: customFrom, to: customTo } : getDateRange(preset);
      const params = new URLSearchParams();
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      if (filterAgent) params.set("agentId", filterAgent);
      if (filterProject) params.set("projectId", filterProject);

      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Chyba načítání reportů");
      const data = await res.json();

      setAgentCalls(data.agentCalls || []);
      setAgentDeals(data.agentDeals || []);
      setCallsByResult(data.callsByResult || []);
      setCallsByDate(data.callsByDate || []);
      setFunnelStages(data.funnelStages || []);
      setDealsByProject(data.dealsByProject || []);
      setDailyDeals(data.dailyDeals || []);
    } catch { setError("Chyba načítání dat"); }
    setLoading(false);
  }, [preset, customFrom, customTo, filterAgent, filterProject]);

  useEffect(() => { loadData(); }, [loadData]);

  // Totals
  const totalCalls = agentCalls.reduce((s, a) => s + Number(a.totalCalls), 0);
  const totalDuration = agentCalls.reduce((s, a) => s + Number(a.totalDuration || 0), 0);
  const totalDeals = agentDeals.reduce((s, a) => s + Number(a.dealCount), 0);
  const totalAmount = agentDeals.reduce((s, a) => s + Number(a.totalAmount || 0), 0);
  const totalCommAgent = agentDeals.reduce((s, a) => s + Number(a.commAgent || 0), 0);
  const totalCommSupervisor = agentDeals.reduce((s, a) => s + Number(a.commSupervisor || 0), 0);
  const totalCommCompany = agentDeals.reduce((s, a) => s + Number(a.commCompany || 0), 0);
  const totalResultCalls = callsByResult.reduce((s, r) => s + Number(r.count), 0);

  // Funnel sorted
  const sortedFunnel = STAGE_ORDER.map(s => ({
    stage: s,
    count: Number(funnelStages.find(f => f.stage === s)?.count || 0),
  }));
  const maxFunnel = Math.max(...sortedFunnel.map(f => f.count), 1);

  // Calls chart - max last 30 bars
  const chartDates = callsByDate.slice(-30);
  const maxDayCount = Math.max(...chartDates.map(d => Number(d.count)), 1);

  // Export
  const exportCSV = (type: string) => {
    const range = preset === "custom" ? { from: customFrom, to: customTo } : getDateRange(preset);
    const params = new URLSearchParams({ type });
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    if (filterAgent) params.set("agentId", filterAgent);
    window.open(`/api/export?${params}`, "_blank");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BarChart3 size={20} className="text-accent" /> Reporty</h1>
          <p className="text-xs text-txt3 mt-1">Analýza výkonu a statistiky</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => exportCSV("contacts")} className="btn-ghost text-xs flex items-center gap-1"><Download size={12} /> Kontakty</button>
            <button onClick={() => exportCSV("calls")} className="btn-ghost text-xs flex items-center gap-1"><Download size={12} /> Hovory</button>
            <button onClick={() => exportCSV("deals")} className="btn-ghost text-xs flex items-center gap-1"><Download size={12} /> Dealy</button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20 flex justify-between">
          {error} <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex gap-1 bg-surface2 rounded-xl p-1 border border-border">
          {(["today", "week", "month", "quarter", "custom"] as Preset[]).map(p => (
            <button key={p} onClick={() => setPreset(p)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${preset === p ? "bg-accent text-white font-bold" : "text-txt3 hover:text-txt"}`}
            >
              {{ today: "Dnes", week: "Týden", month: "Měsíc", quarter: "Kvartál", custom: "Vlastní" }[p]}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-xs" />
            <span className="text-txt3 text-xs">–</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-xs" />
          </div>
        )}
        {isAdmin && (
          <>
            <div className="relative">
              <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className="text-xs pr-8 appearance-none">
                <option value="">Všichni agenti</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="text-xs pr-8 appearance-none">
                <option value="">Všechny projekty</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-[10px] text-txt3 uppercase tracking-wider mb-1"><Phone size={12} /> Hovory</div>
              <div className="text-2xl font-bold">{totalCalls}</div>
              <div className="text-xs text-txt3">{formatDuration(totalDuration)} celkem</div>
            </div>
            <div className="glass rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-[10px] text-txt3 uppercase tracking-wider mb-1"><Handshake size={12} /> Dealy</div>
              <div className="text-2xl font-bold text-green">{totalDeals}</div>
              <div className="text-xs text-txt3">{totalCalls > 0 ? ((totalDeals / totalCalls * 100).toFixed(1) + "% konverze") : "–"}</div>
            </div>
            <div className="glass rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-[10px] text-txt3 uppercase tracking-wider mb-1"><TrendingUp size={12} /> Tržby</div>
              <div className="text-2xl font-bold text-accent">{formatCZK(totalAmount)}</div>
              <div className="text-xs text-txt3">{totalDeals > 0 ? `Ø ${formatCZK(totalAmount / totalDeals)}` : "–"}</div>
            </div>
            <div className="glass rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-[10px] text-txt3 uppercase tracking-wider mb-1"><Users size={12} /> Provize</div>
              <div className="text-lg font-bold">{formatCZK(totalCommAgent + totalCommSupervisor + totalCommCompany)}</div>
              <div className="text-[10px] text-txt3 space-x-2">
                <span>Agent: {formatCZK(totalCommAgent)}</span>
                <span>Sup: {formatCZK(totalCommSupervisor)}</span>
              </div>
            </div>
          </div>

          {/* Agent performance table */}
          {agentCalls.length > 0 && (
            <div className="glass rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Users size={16} className="text-accent" />
                <h3 className="font-bold text-sm">Výkon agentů</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface2/50">
                      <th className="text-left px-4 py-2.5 font-semibold text-txt3">Agent</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Hovory</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Doba</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Zvedl</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Zájem</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Dealy</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Částka</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Provize</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-txt3">Konverze</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agentCalls.map(ac => {
                      const ad = agentDeals.find(d => d.agentId === ac.agentId);
                      const conv = Number(ac.totalCalls) > 0 ? (Number(ac.deals || 0) / Number(ac.totalCalls) * 100) : 0;
                      return (
                        <tr key={ac.agentId} className="hover:bg-surface2/30 transition-colors">
                          <td className="px-4 py-2.5 font-medium">{ac.agentName || "–"}</td>
                          <td className="text-right px-3 py-2.5 font-mono">{ac.totalCalls}</td>
                          <td className="text-right px-3 py-2.5 text-txt3">{formatDuration(Number(ac.totalDuration || 0))}</td>
                          <td className="text-right px-3 py-2.5 text-green">{ac.answered || 0}</td>
                          <td className="text-right px-3 py-2.5 text-emerald-400">{ac.interested || 0}</td>
                          <td className="text-right px-3 py-2.5 font-bold text-cyan-400">{ad?.dealCount || 0}</td>
                          <td className="text-right px-3 py-2.5 font-mono">{formatCZK(Number(ad?.totalAmount || 0))}</td>
                          <td className="text-right px-3 py-2.5 text-accent font-mono">{formatCZK(Number(ad?.commAgent || 0))}</td>
                          <td className="text-right px-4 py-2.5">
                            <span className={`font-bold ${conv > 5 ? "text-green" : conv > 0 ? "text-yellow" : "text-txt3"}`}>
                              {conv.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conversion funnel */}
            <div className="glass rounded-2xl border border-border p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Filter size={14} className="text-accent" /> Konverzní trychtýř</h3>
              <div className="space-y-2">
                {sortedFunnel.map(f => (
                  <div key={f.stage} className="flex items-center gap-3">
                    <span className="text-xs text-txt3 w-24 text-right shrink-0">{STAGE_LABELS[f.stage] || f.stage}</span>
                    <div className="flex-1 bg-surface2 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded-full flex items-center px-2 transition-all duration-500"
                        style={{ width: `${Math.max((f.count / maxFunnel) * 100, f.count > 0 ? 8 : 0)}%` }}
                      >
                        {f.count > 0 && <span className="text-[10px] font-bold text-white">{f.count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call results */}
            <div className="glass rounded-2xl border border-border p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Phone size={14} className="text-accent" /> Výsledky hovorů</h3>
              <div className="space-y-2">
                {callsByResult.sort((a, b) => Number(b.count) - Number(a.count)).map(r => (
                  <div key={r.result} className="flex items-center gap-3">
                    <span className="text-xs text-txt3 w-20 text-right shrink-0">{RESULT_LABELS[r.result] || r.result}</span>
                    <div className="flex-1 bg-surface2 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full rounded-full flex items-center px-2 transition-all duration-500 ${RESULT_COLORS[r.result] || "bg-surface3"}`}
                        style={{ width: `${totalResultCalls > 0 ? Math.max((Number(r.count) / totalResultCalls) * 100, 4) : 0}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{r.count}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-txt3 w-10 text-right">
                      {totalResultCalls > 0 ? (Number(r.count) / totalResultCalls * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calls per day chart */}
            {chartDates.length > 0 && (
              <div className="glass rounded-2xl border border-border p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Clock size={14} className="text-accent" /> Hovory podle dne</h3>
                <div className="flex items-end gap-[2px] h-32">
                  {chartDates.map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div
                        className="w-full bg-accent/50 hover:bg-accent/70 rounded-t transition-all min-h-[2px]"
                        style={{ height: `${(Number(d.count) / maxDayCount) * 100}%` }}
                      />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface border border-border rounded px-1.5 py-0.5 text-[9px] font-mono hidden group-hover:block whitespace-nowrap z-10">
                        {d.date}: {d.count}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-txt3">{chartDates[0]?.date}</span>
                  <span className="text-[9px] text-txt3">{chartDates[chartDates.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* Deals by project */}
            {dealsByProject.length > 0 && (
              <div className="glass rounded-2xl border border-border p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Handshake size={14} className="text-accent" /> Dealy podle projektu</h3>
                <div className="space-y-3">
                  {dealsByProject.map(dp => (
                    <div key={dp.projectName || "none"} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{dp.projectName || "Bez projektu"}</div>
                        <div className="text-[10px] text-txt3">{dp.dealCount} dealů</div>
                      </div>
                      <div className="text-sm font-bold text-accent font-mono">{formatCZK(Number(dp.totalAmount || 0))}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Commission report */}
          {isAdmin && agentDeals.length > 0 && (
            <div className="glass rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <TrendingUp size={16} className="text-accent" />
                <h3 className="font-bold text-sm">Provizní report</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface2/50">
                      <th className="text-left px-4 py-2.5 font-semibold text-txt3">Agent</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Dealů</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Objem</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Provize agent</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-txt3">Provize supervisor</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-txt3">Provize firma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agentDeals.map(ad => (
                      <tr key={ad.agentId} className="hover:bg-surface2/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{ad.agentName || "–"}</td>
                        <td className="text-right px-3 py-2.5 font-mono">{ad.dealCount}</td>
                        <td className="text-right px-3 py-2.5 font-mono">{formatCZK(Number(ad.totalAmount || 0))}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-green">{formatCZK(Number(ad.commAgent || 0))}</td>
                        <td className="text-right px-3 py-2.5 font-mono text-accent">{formatCZK(Number(ad.commSupervisor || 0))}</td>
                        <td className="text-right px-4 py-2.5 font-mono">{formatCZK(Number(ad.commCompany || 0))}</td>
                      </tr>
                    ))}
                    <tr className="bg-surface2/30 font-bold">
                      <td className="px-4 py-2.5">Celkem</td>
                      <td className="text-right px-3 py-2.5 font-mono">{totalDeals}</td>
                      <td className="text-right px-3 py-2.5 font-mono">{formatCZK(totalAmount)}</td>
                      <td className="text-right px-3 py-2.5 font-mono text-green">{formatCZK(totalCommAgent)}</td>
                      <td className="text-right px-3 py-2.5 font-mono text-accent">{formatCZK(totalCommSupervisor)}</td>
                      <td className="text-right px-4 py-2.5 font-mono">{formatCZK(totalCommCompany)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
