"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Phone, Mail, MapPin, ChevronRight, X, ChevronDown, User, Flame, Snowflake } from "lucide-react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneAlt: string;
  email: string;
  city: string;
  address: string;
  pipelineStage: string;
  hotCold: string;
  potentialValue: number;
  projectId: string;
  occupation: string;
  note: string;
  dob: string;
  createdAt: string;
  lastContactDate: string;
}

interface Project {
  id: string;
  name: string;
}

const STAGE_LABELS: Record<string, string> = {
  novy: "Novy", kontaktovany: "Kontaktovany", zajem: "Zajem", nabidka: "Nabidka",
  jednani: "Jednani", smlouva: "Smlouva", uzavreno: "Uzavreno", ztraceno: "Ztraceno",
};

const STAGE_COLORS: Record<string, string> = {
  novy: "bg-blue-500/20 text-blue-400", kontaktovany: "bg-cyan-500/20 text-cyan-400",
  zajem: "bg-yellow-500/20 text-yellow-400", nabidka: "bg-orange-500/20 text-orange-400",
  jednani: "bg-purple-500/20 text-purple-400", smlouva: "bg-indigo-500/20 text-indigo-400",
  uzavreno: "bg-green-500/20 text-green-400", ztraceno: "bg-red-500/20 text-red-400",
};

function formatCZK(amount: number) {
  if (!amount) return "";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

const EMPTY_CONTACT = {
  firstName: "", lastName: "", phone: "", email: "", city: "", address: "",
  pipelineStage: "novy", hotCold: "warm", potentialValue: 0, projectId: "",
  occupation: "", note: "",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterProject) params.set("projectId", filterProject);
    if (filterStage) params.set("stage", filterStage);
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/contacts?${params}`),
      fetch("/api/projects"),
    ]);
    const cData = await cRes.json();
    const pData = await pRes.json();
    setContacts(cData.contacts || []);
    setProjects(pData.projects || []);
    setLoading(false);
  }, [search, filterProject, filterStage]);

  useEffect(() => {
    const t = setTimeout(loadContacts, 300);
    return () => clearTimeout(t);
  }, [loadContacts]);

  const saveNew = async () => {
    setSaving(true);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowNew(false);
    setForm(EMPTY_CONTACT);
    loadContacts();
  };

  const updateStage = async (id: string, newStage: string) => {
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, pipelineStage: newStage } : c));
    if (selected?.id === id) setSelected({ ...selected, pipelineStage: newStage });
    await fetch(`/api/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: newStage }),
    });
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Opravdu smazat tento kontakt?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    loadContacts();
  };

  const totalValue = contacts.reduce((s, c) => s + (c.potentialValue || 0), 0);

  return (
    <div className="flex gap-4 relative">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Kontakty</h1>
            <p className="text-xs text-txt3 mt-1">{contacts.length} kontaktu &middot; {formatCZK(totalValue)} celkova hodnota</p>
          </div>
          <button onClick={() => { setForm(EMPTY_CONTACT); setShowNew(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Novy kontakt
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat kontakty..." className="w-full pl-10" />
          </div>
          <div className="relative">
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="text-sm pr-8 appearance-none">
              <option value="">Vsechny projekty</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="text-sm pr-8 appearance-none">
              <option value="">Vsechny faze</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 text-[10px] font-semibold text-txt3 uppercase tracking-wider border-b border-border">
            <span>Jmeno</span><span>Kontakt</span><span>Mesto</span><span>Faze</span><span className="text-right">Hodnota</span>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-txt3 text-sm">Zadne kontakty</div>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`cursor-pointer transition-colors hover:bg-surface2/50 border-b border-border/50 ${
                  selected?.id === c.id ? "bg-accent/5 border-l-2 border-l-accent" : ""
                }`}
              >
                {/* Desktop table row */}
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-2 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                      {c.firstName?.charAt(0)}
                    </div>
                    <div>
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      {c.hotCold === "hot" && <Flame size={10} className="inline ml-1 text-red" />}
                      {c.hotCold === "cold" && <Snowflake size={10} className="inline ml-1 text-blue-400" />}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs text-txt2 justify-center">
                    {c.phone && <span className="flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1 truncate"><Mail size={10} />{c.email}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-txt2">
                    {c.city && <><MapPin size={10} />{c.city}</>}
                  </div>
                  <div className="flex items-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_COLORS[c.pipelineStage] || "bg-surface3 text-txt3"}`}>
                      {STAGE_LABELS[c.pipelineStage] || c.pipelineStage}
                    </span>
                  </div>
                  <div className="flex items-center justify-end text-xs font-mono text-green">
                    {formatCZK(c.potentialValue)}
                  </div>
                </div>
                {/* Mobile card */}
                <div className="md:hidden px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                      {c.firstName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{c.firstName} {c.lastName}</span>
                        {c.hotCold === "hot" && <Flame size={10} className="text-red shrink-0" />}
                        {c.hotCold === "cold" && <Snowflake size={10} className="text-blue-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-txt2">
                        {c.phone && <span className="flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                        {c.city && <span className="flex items-center gap-1"><MapPin size={10} />{c.city}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_COLORS[c.pipelineStage] || "bg-surface3 text-txt3"}`}>
                        {STAGE_LABELS[c.pipelineStage] || c.pipelineStage}
                      </span>
                      {c.potentialValue > 0 && (
                        <span className="text-[11px] font-mono text-green">{formatCZK(c.potentialValue)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/50 md:bg-transparent md:relative md:inset-auto md:z-auto md:w-80 md:shrink-0" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="glass rounded-2xl border border-border p-5 fixed bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto md:static md:max-h-none md:overflow-visible md:sticky md:top-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-sm font-bold text-accent">
                  {selected.firstName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold">{selected.firstName} {selected.lastName}</h3>
                  {selected.occupation && <p className="text-[10px] text-txt3">{selected.occupation}</p>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-txt3 hover:text-txt">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {selected.phone && (
                <div className="flex items-center gap-2 text-txt2">
                  <Phone size={14} className="text-accent shrink-0" />
                  <a href={`tel:${selected.phone}`} className="hover:text-accent">{selected.phone}</a>
                </div>
              )}
              {selected.phoneAlt && (
                <div className="flex items-center gap-2 text-txt2">
                  <Phone size={14} className="text-txt3 shrink-0" />
                  <a href={`tel:${selected.phoneAlt}`} className="hover:text-accent">{selected.phoneAlt}</a>
                </div>
              )}
              {selected.email && (
                <div className="flex items-center gap-2 text-txt2">
                  <Mail size={14} className="text-accent shrink-0" />
                  <a href={`mailto:${selected.email}`} className="hover:text-accent truncate">{selected.email}</a>
                </div>
              )}
              {(selected.city || selected.address) && (
                <div className="flex items-center gap-2 text-txt2">
                  <MapPin size={14} className="text-accent shrink-0" />
                  <span>{[selected.address, selected.city].filter(Boolean).join(", ")}</span>
                </div>
              )}

              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-txt3">Faze</span>
                  <div className="relative">
                    <select
                      value={selected.pipelineStage}
                      onChange={(e) => updateStage(selected.id, e.target.value)}
                      className="text-[10px] font-bold bg-transparent border-none p-0 pr-4 appearance-none cursor-pointer"
                    >
                      {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-txt3">Teplota</span>
                  <span className={`font-bold ${selected.hotCold === "hot" ? "text-red" : selected.hotCold === "cold" ? "text-blue-400" : "text-yellow"}`}>
                    {selected.hotCold === "hot" ? "HOT" : selected.hotCold === "cold" ? "COLD" : "WARM"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-txt3">Hodnota</span>
                  <span className="text-green font-mono font-bold">{formatCZK(selected.potentialValue)}</span>
                </div>
                {selected.lastContactDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-txt3">Posledni kontakt</span>
                    <span className="text-txt2">{new Date(selected.lastContactDate).toLocaleDateString("cs-CZ")}</span>
                  </div>
                )}
              </div>

              {selected.note && (
                <div className="pt-3 border-t border-border">
                  <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Poznamka</div>
                  <p className="text-xs text-txt2">{selected.note}</p>
                </div>
              )}

              <div className="pt-3 border-t border-border">
                <button onClick={() => deleteContact(selected.id)} className="text-xs text-red hover:text-red/80 transition-colors">
                  Smazat kontakt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New contact modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">Novy kontakt</h3>
              <button onClick={() => setShowNew(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Jmeno</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Prijmeni</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Telefon</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Mesto</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Adresa</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Faze</label>
                  <select value={form.pipelineStage} onChange={(e) => setForm({ ...form, pipelineStage: e.target.value })} className="w-full">
                    {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Teplota</label>
                  <select value={form.hotCold} onChange={(e) => setForm({ ...form, hotCold: e.target.value })} className="w-full">
                    <option value="hot">HOT</option>
                    <option value="warm">WARM</option>
                    <option value="cold">COLD</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Hodnota (CZK)</label>
                  <input type="number" value={form.potentialValue || ""} onChange={(e) => setForm({ ...form, potentialValue: Number(e.target.value) })} className="w-full" />
                </div>
              </div>
              {projects.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Projekt</label>
                  <div className="relative">
                    <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full appearance-none pr-8">
                      <option value="">Zadny</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Poznamka</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowNew(false)} className="btn-ghost text-sm">Zrusit</button>
              <button onClick={saveNew} disabled={saving || !form.firstName} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukladani..." : "Vytvorit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
