"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, Phone, TrendingUp, Clock, Database, FileText, FolderOpen, Activity, UserCheck, PhoneCall, ArrowRight } from "lucide-react";

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

interface StageStats { stage: string; count: number }
interface CallStats { result: string; count: number }
interface HotColdStats { hotCold: string; count: number }
interface TopAgent { agentName: string; dealCount: number; totalAmount: number }

interface RecentDeal {
  id: string; amount: number; product: string;
  contactFirstName: string; contactLastName: string;
  projectName: string; agentName: string;
}

interface ActivityItem {
  id: string; contactId: string; agentId: string;
  type: string; detail: string; previousValue: string; newValue: string;
  createdAt: string; contactFirstName: string; contactLastName: string; agentName: string;
}

interface AgentActivityRow {
  agentId: string; agentName: string; type: string; count: number;
}

interface AgentCallRow {
  agentId: string; agentName: string; count: number; totalDuration: number;
}

interface TouchedContact {
  contactId: string; contactFirstName: string; contactLastName: string; contactPhone: string;
  agentId: string; agentName: string; type: string; detail: string; createdAt: string;
}

interface UserInfo { role: string }

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

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Hovor", stage_change: "Zmena faze", deal: "Obchod", assigned: "Prirazeni", note: "Poznamka",
};

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: "text-blue-400", stage_change: "text-yellow-400", deal: "text-green-400",
  assigned: "text-purple-400", note: "text-gray-400",
};

function formatCZK(amount: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "prave ted";
  if (mins < 60) return `pred ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `pred ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `pred ${days}d`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [callStats, setCallStats] = useState<CallStats[]>([]);
  const [hotColdStats, setHotColdStats] = useState<HotColdStats[]>([]);
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [todayAgentActivity, setTodayAgentActivity] = useState<AgentActivityRow[]>([]);
  const [todayAgentCalls, setTodayAgentCalls] = useState<AgentCallRow[]>([]);
  const [todayTouchedContacts, setTodayTouchedContacts] = useState<TouchedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([d, u]) => {
      setStats(d.stats);
      setStageStats(d.stageStats || []);
      setCallStats(d.callStats || []);
      setHotColdStats(d.hotColdStats || []);
      setTopAgents(d.topAgents || []);
      setRecentDeals(d.recentDeals || []);
      setRecentActivity(d.recentActivity || []);
      setTodayAgentActivity(d.todayAgentActivity || []);
      setTodayAgentCalls(d.todayAgentCalls || []);
      setTodayTouchedContacts(d.todayTouchedContacts || []);
      setUserInfo(u.user || null);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!stats) return <div className="text-red">Chyba nacitani dat</div>;

  const isAdmin = userInfo?.role === "admin" || userInfo?.role === "supervisor";

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

  // Build per-agent summary from today's data
  const agentSummary = new Map<string, { name: string; calls: number; duration: number; stageChanges: number; deals: number; assigned: number; totalActions: number }>();
  for (const row of todayAgentActivity) {
    if (!agentSummary.has(row.agentId)) {
      agentSummary.set(row.agentId, { name: row.agentName || "—", calls: 0, duration: 0, stageChanges: 0, deals: 0, assigned: 0, totalActions: 0 });
    }
    const ag = agentSummary.get(row.agentId)!;
    ag.totalActions += row.count;
    if (row.type === "call") ag.calls += row.count;
    if (row.type === "stage_change") ag.stageChanges += row.count;
    if (row.type === "deal") ag.deals += row.count;
    if (row.type === "assigned") ag.assigned += row.count;
  }
  for (const row of todayAgentCalls) {
    if (!agentSummary.has(row.agentId)) {
      agentSummary.set(row.agentId, { name: row.agentName || "—", calls: 0, duration: 0, stageChanges: 0, deals: 0, assigned: 0, totalActions: 0 });
    }
    const ag = agentSummary.get(row.agentId)!;
    ag.calls = Math.max(ag.calls, row.count);
    ag.duration = Number(row.totalDuration) || 0;
  }
  const agentSummaryArr = Array.from(agentSummary.entries()).sort((a, b) => b[1].totalActions - a[1].totalActions);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`${c.cls} glass rounded-2xl border p-3 sm:p-5 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-txt3 uppercase tracking-wider">{c.label}</span>
              <div className={`w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center ${c.iconColor}`}>
                <c.icon size={15} />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Admin: Today's Operator Overview */}
      {isAdmin && agentSummaryArr.length > 0 && (
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck size={16} className="text-accent" />
            <h2 className="text-sm font-bold">Dnesni prehled operatoru</h2>
            <span className="text-[10px] font-mono text-txt3 ml-auto">{new Date().toLocaleDateString("cs-CZ")}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-txt3 uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 px-3">Operator</th>
                  <th className="text-center py-2 px-3">Hovory</th>
                  <th className="text-center py-2 px-3">Doba hovoru</th>
                  <th className="text-center py-2 px-3">Zmeny faze</th>
                  <th className="text-center py-2 px-3">Obchody</th>
                  <th className="text-center py-2 px-3">Prirazeni</th>
                  <th className="text-center py-2 px-3">Celkem</th>
                </tr>
              </thead>
              <tbody>
                {agentSummaryArr.map(([agentId, ag]) => (
                  <tr key={agentId} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-[10px] font-bold text-accent">
                          {ag.name.charAt(0)}
                        </div>
                        <span className="font-medium">{ag.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-2.5 px-3 font-mono">{ag.calls}</td>
                    <td className="text-center py-2.5 px-3 font-mono text-txt3">
                      {ag.duration > 0 ? `${Math.floor(ag.duration / 60)}m ${ag.duration % 60}s` : "—"}
                    </td>
                    <td className="text-center py-2.5 px-3 font-mono">{ag.stageChanges}</td>
                    <td className="text-center py-2.5 px-3 font-mono text-green">{ag.deals}</td>
                    <td className="text-center py-2.5 px-3 font-mono">{ag.assigned}</td>
                    <td className="text-center py-2.5 px-3">
                      <span className="bg-accent/10 text-accent text-xs font-bold px-2 py-0.5 rounded-full">{ag.totalActions}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin: Today's Touched Contacts */}
      {isAdmin && todayTouchedContacts.length > 0 && (
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <PhoneCall size={16} className="text-green" />
            <h2 className="text-sm font-bold">Dnes pouzite kontakty</h2>
            <span className="text-[10px] font-mono text-txt3 ml-auto">{todayTouchedContacts.length} kontaktu</span>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {todayTouchedContacts.map((tc, i) => (
              <div key={`${tc.contactId}-${i}`} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-surface2 transition-colors text-sm">
                <span className={`text-[10px] font-bold uppercase ${ACTIVITY_TYPE_COLORS[tc.type] || "text-txt3"}`}>
                  {ACTIVITY_TYPE_LABELS[tc.type] || tc.type}
                </span>
                <span className="font-medium">{tc.contactFirstName} {tc.contactLastName}</span>
                {tc.contactPhone && <span className="text-txt3 text-xs">{tc.contactPhone}</span>}
                <ArrowRight size={10} className="text-txt3" />
                <span className="text-xs text-txt3">{tc.agentName}</span>
                {tc.detail && <span className="text-[10px] text-txt3 ml-auto truncate max-w-[200px]">{tc.detail}</span>}
                <span className="text-[10px] text-txt3 shrink-0">{timeAgo(tc.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline + Call stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold">Vysledky hovoru</h2>
            <span className="text-[10px] font-mono text-txt3">{totalCalls} hovoru</span>
          </div>
          {callStats.length === 0 ? (
            <p className="text-sm text-txt3">Zadne hovory</p>
          ) : (
            <>
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

      {/* Recent activity timeline + Recent deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity timeline */}
        <div className="glass rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-accent" />
            <h3 className="text-sm font-bold">Posledni aktivita</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-txt3">Zadna aktivita</p>
          ) : (
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-surface2 transition-colors">
                  <div className={`text-[10px] font-bold uppercase mt-0.5 shrink-0 w-16 ${ACTIVITY_TYPE_COLORS[a.type] || "text-txt3"}`}>
                    {ACTIVITY_TYPE_LABELS[a.type] || a.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{a.contactFirstName} {a.contactLastName}</span>
                      {a.detail && <span className="text-txt3 ml-1.5 text-xs">{a.detail}</span>}
                    </div>
                    {a.previousValue && a.newValue && (
                      <div className="text-[10px] text-txt3 mt-0.5">
                        {STAGE_LABELS[a.previousValue] || a.previousValue} <ArrowRight size={8} className="inline" /> {STAGE_LABELS[a.newValue] || a.newValue}
                      </div>
                    )}
                    <div className="text-[10px] text-txt3 mt-0.5">{a.agentName} &middot; {timeAgo(a.createdAt)}</div>
                  </div>
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
                      <div className="text-[10px] text-txt3">{d.agentName} &middot; {d.projectName || d.product}</div>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-green shrink-0 ml-2">{formatCZK(d.amount || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
