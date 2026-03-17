"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, X, ChevronDown, Users, Phone, Handshake, Target,
  Calendar, Pause, Play, CheckCircle, FileText, Pencil, Trash2,
  TrendingUp, BookOpen,
} from "lucide-react";

interface Campaign {
  id: string; name: string; projectId: string; startDate: string; endDate: string;
  status: string; dailyCallGoal: number; dailyDealGoal: number; description: string;
  createdAt: string; projectName: string; projectColor: string;
  agents: { agentId: string; agentName: string }[];
}

interface Project { id: string; name: string; color: string; }
interface Agent { id: string; name: string; role: string; active: boolean; }
interface Script { id: string; campaignId: string; name: string; type: string; content: string; sortOrder: number; active: boolean; }

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Play }> = {
  active: { label: "Aktivní", color: "bg-green/10 text-green border-green/20", icon: Play },
  paused: { label: "Pozastavená", color: "bg-yellow/10 text-yellow border-yellow/20", icon: Pause },
  completed: { label: "Dokončená", color: "bg-txt3/10 text-txt3 border-txt3/20", icon: CheckCircle },
};

const SCRIPT_TYPES: Record<string, string> = {
  intro: "Úvod", qualification: "Kvalifikace", product: "Produkt",
  objection: "Námitky", closing: "Závěr", general: "Obecný",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("cs-CZ"); } catch { return d; }
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState("active");

  // Campaign modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", projectId: "", startDate: "", endDate: "", status: "active",
    dailyCallGoal: 0, dailyDealGoal: 0, description: "", agentIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  // Scripts panel
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptForm, setScriptForm] = useState({ name: "", type: "general", content: "", sortOrder: 0 });
  const [editScriptId, setEditScriptId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const [cRes, pRes, aRes] = await Promise.all([
        fetch(`/api/campaigns${params}`),
        fetch("/api/projects"),
        fetch("/api/users"),
      ]);
      if (cRes.ok) setCampaigns((await cRes.json()).campaigns || []);
      if (pRes.ok) setProjects((await pRes.json()).projects || []);
      if (aRes.ok) {
        const data = await aRes.json();
        setAgents((data.users || []).filter((u: Agent) => u.active));
      }
    } catch { setError("Chyba načítání"); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadScripts = async (campaignId: string) => {
    setSelectedCampaign(campaignId);
    try {
      const res = await fetch(`/api/scripts?campaignId=${campaignId}&active=false`);
      if (res.ok) setScripts((await res.json()).scripts || []);
    } catch { /* */ }
  };

  const saveCampaign = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editId ? `/api/campaigns/${editId}` : "/api/campaigns";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setShowModal(false);
      setEditId(null);
      loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Chyba uložení"); }
    setSaving(false);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Opravdu smazat kampaň? Smaže se i se skripty a KB články.")) return;
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      loadData();
      if (selectedCampaign === id) setSelectedCampaign(null);
    } catch { setError("Chyba mazání"); }
  };

  const openEdit = (c: Campaign) => {
    setForm({
      name: c.name, projectId: c.projectId || "", startDate: c.startDate || "",
      endDate: c.endDate || "", status: c.status, dailyCallGoal: c.dailyCallGoal,
      dailyDealGoal: c.dailyDealGoal, description: c.description || "",
      agentIds: c.agents.map(a => a.agentId),
    });
    setEditId(c.id);
    setShowModal(true);
  };

  const openNew = () => {
    setForm({ name: "", projectId: "", startDate: "", endDate: "", status: "active",
      dailyCallGoal: 0, dailyDealGoal: 0, description: "", agentIds: [] });
    setEditId(null);
    setShowModal(true);
  };

  const toggleAgent = (agentId: string) => {
    setForm(f => ({
      ...f,
      agentIds: f.agentIds.includes(agentId)
        ? f.agentIds.filter(id => id !== agentId)
        : [...f.agentIds, agentId],
    }));
  };

  // Scripts CRUD
  const saveScript = async () => {
    if (!scriptForm.name.trim() || !scriptForm.content.trim() || !selectedCampaign) return;
    setSaving(true);
    try {
      const url = editScriptId ? `/api/scripts/${editScriptId}` : "/api/scripts";
      const res = await fetch(url, {
        method: editScriptId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scriptForm, campaignId: selectedCampaign }),
      });
      if (res.ok) {
        setShowScriptModal(false);
        setEditScriptId(null);
        loadScripts(selectedCampaign);
      }
    } catch { setError("Chyba uložení skriptu"); }
    setSaving(false);
  };

  const deleteScript = async (id: string) => {
    if (!confirm("Smazat skript?")) return;
    await fetch(`/api/scripts/${id}`, { method: "DELETE" });
    if (selectedCampaign) loadScripts(selectedCampaign);
  };

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Kampaně</h1>
          <p className="text-xs text-txt3 mt-1">{campaigns.length} kampaní</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm pr-8 appearance-none">
              <option value="">Všechny</option>
              <option value="active">Aktivní</option>
              <option value="paused">Pozastavené</option>
              <option value="completed">Dokončené</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
          </div>
          {isAdmin && (
            <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Nová kampaň
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20 flex justify-between">
          {error} <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        {/* Campaign list */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : campaigns.length === 0 ? (
            <div className="glass rounded-2xl border border-border p-8 text-center text-txt3 text-sm">Žádné kampaně</div>
          ) : campaigns.map(c => {
            const cfg = STATUS_CFG[c.status] || STATUS_CFG.active;
            const isSelected = selectedCampaign === c.id;
            return (
              <div
                key={c.id}
                onClick={() => loadScripts(c.id)}
                className={`glass rounded-2xl border p-5 cursor-pointer transition-all ${
                  isSelected ? "border-accent/30 bg-accent/5" : "border-border hover:border-border2"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm">{c.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {c.projectName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          {c.projectName}
                        </span>
                      )}
                    </div>
                    {c.description && <p className="text-xs text-txt3 mt-1 line-clamp-1">{c.description}</p>}

                    <div className="flex items-center gap-4 mt-2 text-xs text-txt2">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(c.startDate)} – {fmtDate(c.endDate)}</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {c.agents.length} agentů</span>
                      {c.dailyCallGoal > 0 && <span className="flex items-center gap-1"><Phone size={11} /> {c.dailyCallGoal}/den</span>}
                      {c.dailyDealGoal > 0 && <span className="flex items-center gap-1"><Handshake size={11} /> {c.dailyDealGoal}/den</span>}
                    </div>

                    {c.agents.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.agents.map(a => (
                          <span key={a.agentId} className="text-[10px] px-2 py-0.5 rounded-full bg-purple/10 text-purple font-medium">
                            {a.agentName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded-lg hover:bg-surface2 text-txt3 hover:text-accent transition-all">
                        <Pencil size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id); }} className="p-1.5 rounded-lg hover:bg-red/10 text-txt3 hover:text-red transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scripts panel */}
        <div>
          {selectedCampaignData ? (
            <div className="glass rounded-2xl border border-border p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <FileText size={16} className="text-accent" /> Skripty — {selectedCampaignData.name}
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => { setScriptForm({ name: "", type: "general", content: "", sortOrder: scripts.length }); setEditScriptId(null); setShowScriptModal(true); }}
                    className="text-xs text-accent hover:text-accent2 flex items-center gap-1"
                  >
                    <Plus size={14} /> Přidat
                  </button>
                )}
              </div>

              {scripts.length === 0 ? (
                <p className="text-xs text-txt3 text-center py-4">Žádné skripty</p>
              ) : (
                <div className="space-y-2">
                  {scripts.map(s => (
                    <div key={s.id} className={`p-3 rounded-xl border ${s.active ? "bg-surface2/30 border-border/30" : "bg-surface2/10 border-border/20 opacity-50"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{s.name}</span>
                          <span className="text-[10px] text-txt3 bg-surface2 px-1.5 py-0.5 rounded">{SCRIPT_TYPES[s.type] || s.type}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button onClick={() => { setScriptForm({ name: s.name, type: s.type, content: s.content, sortOrder: s.sortOrder }); setEditScriptId(s.id); setShowScriptModal(true); }} className="text-txt3 hover:text-accent">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deleteScript(s.id)} className="text-txt3 hover:text-red">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-txt2 whitespace-pre-wrap line-clamp-3">{s.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-2xl border border-border p-8 text-center text-txt3 text-sm">
              <FileText size={24} className="mx-auto mb-2 opacity-30" />
              Vyberte kampaň pro zobrazení skriptů
            </div>
          )}
        </div>
      </div>

      {/* Campaign modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">{editId ? "Upravit kampaň" : "Nová kampaň"}</h3>
              <button onClick={() => setShowModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Název</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Projekt</label>
                  <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full">
                    <option value="">—</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full">
                    <option value="active">Aktivní</option>
                    <option value="paused">Pozastavená</option>
                    <option value="completed">Dokončená</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Začátek</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Konec</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Cíl hovorů/den</label>
                  <input type="number" value={form.dailyCallGoal || ""} onChange={e => setForm({ ...form, dailyCallGoal: Number(e.target.value) })} className="w-full" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Cíl dealů/den</label>
                  <input type="number" value={form.dailyDealGoal || ""} onChange={e => setForm({ ...form, dailyDealGoal: Number(e.target.value) })} className="w-full" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Popis</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-2 block">Přiřazení agenti</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {agents.filter(a => a.role === "agent").map(a => (
                    <button
                      key={a.id}
                      onClick={() => toggleAgent(a.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-all ${
                        form.agentIds.includes(a.id) ? "border-purple bg-purple/10 text-purple" : "border-border hover:border-purple/30"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-purple/10 flex items-center justify-center text-[10px] font-bold text-purple">{a.name.charAt(0)}</div>
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowModal(false)} className="btn-ghost text-sm">Zrušit</button>
              <button onClick={saveCampaign} disabled={saving || !form.name.trim()} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukládám..." : editId ? "Uložit" : "Vytvořit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">{editScriptId ? "Upravit skript" : "Nový skript"}</h3>
              <button onClick={() => setShowScriptModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Název</label>
                  <input value={scriptForm.name} onChange={e => setScriptForm({ ...scriptForm, name: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Typ</label>
                  <select value={scriptForm.type} onChange={e => setScriptForm({ ...scriptForm, type: e.target.value })} className="w-full">
                    {Object.entries(SCRIPT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Obsah</label>
                <textarea value={scriptForm.content} onChange={e => setScriptForm({ ...scriptForm, content: e.target.value })} rows={10} className="w-full text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Pořadí</label>
                <input type="number" value={scriptForm.sortOrder} onChange={e => setScriptForm({ ...scriptForm, sortOrder: Number(e.target.value) })} className="w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowScriptModal(false)} className="btn-ghost text-sm">Zrušit</button>
              <button onClick={saveScript} disabled={saving || !scriptForm.name.trim() || !scriptForm.content.trim()} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukládám..." : editScriptId ? "Uložit" : "Vytvořit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
