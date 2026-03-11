"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X, Briefcase } from "lucide-react";

interface Project {
  id: string;
  name: string;
  color: string;
  product: string;
  minInvestment: number;
  maxInvestment: number;
  riskProfile: string;
  horizon: string;
  currency: string;
  commissionAgent: number;
  commissionSupervisor: number;
  commissionCompany: number;
  status: string;
  description: string;
}

function formatCZK(amount: number) {
  if (!amount) return "—";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green/10 text-green border-green/20",
  medium: "bg-yellow/10 text-yellow border-yellow/20",
  high: "bg-red/10 text-red border-red/20",
};

const RISK_LABELS: Record<string, string> = {
  low: "Nizke", medium: "Stredni", high: "Vysoke",
};

const EMPTY_PROJECT = {
  name: "", color: "#3b82f6", product: "", minInvestment: 0, maxInvestment: 0,
  riskProfile: "medium", horizon: "", currency: "CZK", commissionAgent: 0,
  commissionSupervisor: 0, commissionCompany: 0, status: "active", description: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_PROJECT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {});
  }, []);

  const load = async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Chyba načítání projektů");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba načítání");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(EMPTY_PROJECT);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setForm({
      name: p.name || "", color: p.color || "#3b82f6", product: p.product || "",
      minInvestment: p.minInvestment || 0, maxInvestment: p.maxInvestment || 0,
      riskProfile: p.riskProfile || "medium", horizon: p.horizon || "",
      currency: p.currency || "CZK", commissionAgent: p.commissionAgent || 0,
      commissionSupervisor: p.commissionSupervisor || 0, commissionCompany: p.commissionCompany || 0,
      status: p.status || "active", description: p.description || "",
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/projects/${editId}` : "/api/projects";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Chyba ukládání"); }
      setShowModal(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba ukládání");
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Opravdu smazat tento projekt?")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Chyba mazání"); }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba mazání");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20 flex justify-between items-center">
          {error}
          <button onClick={() => setError("")} className="text-red hover:text-red/70"><X size={14} /></button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Projekty</h1>
        {user?.role === "admin" && (
          <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Novy projekt
          </button>
        )}
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p.id} className="glass rounded-2xl border border-border p-5 hover:border-border2 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${p.color}20` }}
                >
                  <Briefcase size={18} style={{ color: p.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{p.name}</h3>
                  {p.product && <p className="text-[11px] text-txt3">{p.product}</p>}
                </div>
              </div>
              {user?.role === "admin" && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-accent">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deleteProject(p.id)} className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-red">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>

            {p.description && (
              <p className="text-xs text-txt2 mb-4 line-clamp-2">{p.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface2/50 rounded-xl p-3">
                <div className="text-[10px] text-txt3 mb-1">Min. investice</div>
                <div className="text-xs font-mono font-bold">{formatCZK(p.minInvestment)}</div>
              </div>
              <div className="bg-surface2/50 rounded-xl p-3">
                <div className="text-[10px] text-txt3 mb-1">Max. investice</div>
                <div className="text-xs font-mono font-bold">{formatCZK(p.maxInvestment)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {p.riskProfile && (
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${RISK_COLORS[p.riskProfile] || "bg-surface3 text-txt3"}`}>
                  Riziko: {RISK_LABELS[p.riskProfile] || p.riskProfile}
                </span>
              )}
              {p.horizon && (
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-surface3 text-txt3">
                  {p.horizon}
                </span>
              )}
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                p.status === "active" ? "bg-green/10 text-green" : "bg-surface3 text-txt3"
              }`}>
                {p.status === "active" ? "Aktivni" : "Neaktivni"}
              </span>
            </div>

            {(p.commissionAgent || p.commissionSupervisor || p.commissionCompany) ? (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-[10px] text-txt3 mb-2 font-semibold uppercase tracking-wider">Provize</div>
                <div className="flex gap-3 text-[11px]">
                  {p.commissionAgent > 0 && <span className="text-accent">Agent: {p.commissionAgent}%</span>}
                  {p.commissionSupervisor > 0 && <span className="text-purple">Supervizor: {p.commissionSupervisor}%</span>}
                  {p.commissionCompany > 0 && <span className="text-txt2">Firma: {p.commissionCompany}%</span>}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="glass rounded-2xl border border-border p-12 text-center">
          <Briefcase size={32} className="mx-auto mb-3 text-txt3" />
          <p className="text-txt3 text-sm">Zatim nemate zadne projekty</p>
          <button onClick={openNew} className="btn-primary mt-4 text-sm">Vytvorit prvni projekt</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">{editId ? "Upravit projekt" : "Novy projekt"}</h3>
              <button onClick={() => setShowModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-[1fr_60px] gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Nazev</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Barva</label>
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-[42px] cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Produkt</label>
                <input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Popis</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Min. investice (CZK)</label>
                  <input type="number" value={form.minInvestment || ""} onChange={(e) => setForm({ ...form, minInvestment: Number(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Max. investice (CZK)</label>
                  <input type="number" value={form.maxInvestment || ""} onChange={(e) => setForm({ ...form, maxInvestment: Number(e.target.value) })} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Riziko</label>
                  <select value={form.riskProfile} onChange={(e) => setForm({ ...form, riskProfile: e.target.value })} className="w-full">
                    <option value="low">Nizke</option>
                    <option value="medium">Stredni</option>
                    <option value="high">Vysoke</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Horizont</label>
                  <input value={form.horizon} onChange={(e) => setForm({ ...form, horizon: e.target.value })} placeholder="5 let" className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
                    <option value="active">Aktivni</option>
                    <option value="inactive">Neaktivni</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Provize Agent %</label>
                  <input type="number" step="0.1" value={form.commissionAgent || ""} onChange={(e) => setForm({ ...form, commissionAgent: Number(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Provize Supervizor %</label>
                  <input type="number" step="0.1" value={form.commissionSupervisor || ""} onChange={(e) => setForm({ ...form, commissionSupervisor: Number(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Provize Firma %</label>
                  <input type="number" step="0.1" value={form.commissionCompany || ""} onChange={(e) => setForm({ ...form, commissionCompany: Number(e.target.value) })} className="w-full" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowModal(false)} className="btn-ghost text-sm">Zrusit</button>
              <button onClick={save} disabled={saving || !form.name} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukladani..." : editId ? "Ulozit" : "Vytvorit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
