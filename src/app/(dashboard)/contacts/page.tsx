"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Phone, Mail, MapPin, ChevronRight, X, ChevronDown, Flame, Snowflake, UserCheck, CheckSquare, Square, Users } from "lucide-react";

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
  agentId: string;
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

interface DatabaseRecord {
  id: string;
  name: string;
  uploadDate: string;
  contactCount: number;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
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
  const [databases, setDatabases] = useState<DatabaseRecord[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterDatabase, setFilterDatabase] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  // Bulk selection & assignment
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showAssign, setShowAssign] = useState(false);
  const [assignAgent, setAssignAgent] = useState("");
  const [assigning, setAssigning] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {});
  }, []);

  // Fetch agents list for admin/supervisor
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/users").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.users) setAgents(d.users.filter((u: Agent) => u.active));
    }).catch(() => {});
  }, [isAdmin]);

  const loadContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterProject) params.set("projectId", filterProject);
      if (filterStage) params.set("stage", filterStage);
      if (filterDatabase) params.set("databaseId", filterDatabase);
      if (filterAgent) params.set("agentId", filterAgent);
      params.set("limit", "500");
      const [cRes, pRes, dbRes] = await Promise.all([
        fetch(`/api/contacts?${params}`),
        fetch("/api/projects"),
        fetch("/api/databases"),
      ]);
      if (!cRes.ok || !pRes.ok) throw new Error("Chyba nacitani dat");
      const cData = await cRes.json();
      const pData = await pRes.json();
      setContacts(cData.contacts || []);
      setProjects(pData.projects || []);
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDatabases(dbData.databases || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba nacitani");
    } finally {
      setLoading(false);
    }
  }, [search, filterProject, filterStage, filterDatabase, filterAgent]);

  useEffect(() => {
    const t = setTimeout(loadContacts, 300);
    return () => clearTimeout(t);
  }, [loadContacts]);

  const saveNew = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Chyba ukladani"); }
      setShowNew(false);
      setForm(EMPTY_CONTACT);
      loadContacts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba ukladani");
    } finally {
      setSaving(false);
    }
  };

  const updateStage = async (id: string, newStage: string) => {
    const prev = contacts;
    setContacts((p) => p.map((c) => c.id === id ? { ...c, pipelineStage: newStage } : c));
    if (selected?.id === id) setSelected({ ...selected, pipelineStage: newStage });
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      });
      if (!res.ok) throw new Error("Chyba aktualizace");
    } catch {
      setContacts(prev);
      setError("Nepodarilo se zmenit fazi");
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Opravdu smazat tento kontakt?")) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Chyba mazani"); }
      if (selected?.id === id) setSelected(null);
      loadContacts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba mazani");
    }
  };

  // Bulk selection
  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checked.size === contacts.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(contacts.map(c => c.id)));
    }
  };

  // Assign contacts to agent
  const doAssign = async () => {
    if (!assignAgent || checked.size === 0) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/contacts/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(checked), agentId: assignAgent }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Chyba prideleni"); }
      const result = await res.json();
      setShowAssign(false);
      setChecked(new Set());
      setAssignAgent("");
      loadContacts();
      const agentName = agents.find(a => a.id === assignAgent)?.name || "";
      setError(""); // clear previous errors
      alert(`Prideleno ${result.assigned} kontaktu agentovi ${agentName}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba prideleni");
    } finally {
      setAssigning(false);
    }
  };

  const getAgentName = (agentId: string) => agents.find(a => a.id === agentId)?.name || "";

  const totalValue = contacts.reduce((s, c) => s + (c.potentialValue || 0), 0);

  return (
    <div className="flex gap-4 relative">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Kontakty</h1>
            <p className="text-xs text-txt3 mt-1">{contacts.length} kontaktu &middot; {formatCZK(totalValue)} celkova hodnota</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && checked.size > 0 && (
              <button onClick={() => setShowAssign(true)} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-purple/10 text-purple border border-purple/20 hover:bg-purple/20 transition-all font-medium">
                <UserCheck size={16} /> Pridelit ({checked.size})
              </button>
            )}
            <button onClick={() => { setForm(EMPTY_CONTACT); setShowNew(true); }} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Novy kontakt
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20 flex justify-between items-center">
            {error}
            <button onClick={() => setError("")} className="text-red hover:text-red/70"><X size={14} /></button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat kontakty..." className="w-full pl-10" />
          </div>
          {isAdmin && agents.length > 0 && (
            <div className="relative">
              <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="text-sm pr-8 appearance-none">
                <option value="">Vsichni agenti</option>
                {agents.filter(a => a.role === "agent").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
            </div>
          )}
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
          <div className="relative">
            <select value={filterDatabase} onChange={(e) => setFilterDatabase(e.target.value)} className="text-sm pr-8 appearance-none">
              <option value="">Vsechny databaze</option>
              {databases.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.contactCount})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className={`hidden md:grid gap-2 px-4 py-2.5 text-[10px] font-semibold text-txt3 uppercase tracking-wider border-b border-border ${isAdmin ? "grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr_1fr]" : "grid-cols-[2fr_1.5fr_1fr_1fr_1fr]"}`}>
            {isAdmin && (
              <button onClick={toggleAll} className="flex items-center justify-center w-5">
                {checked.size === contacts.length && contacts.length > 0 ? <CheckSquare size={14} className="text-accent" /> : <Square size={14} />}
              </button>
            )}
            <span>Jmeno</span><span>Kontakt</span>
            {isAdmin && <span>Agent</span>}
            <span>Mesto</span><span>Faze</span><span className="text-right">Hodnota</span>
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
                } ${checked.has(c.id) ? "bg-purple/5" : ""}`}
              >
                {/* Desktop table row */}
                <div className={`hidden md:grid gap-2 px-4 py-3 text-sm ${isAdmin ? "grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr_1fr]" : "grid-cols-[2fr_1.5fr_1fr_1fr_1fr]"}`}>
                  {isAdmin && (
                    <button onClick={(e) => toggleCheck(c.id, e)} className="flex items-center justify-center w-5">
                      {checked.has(c.id) ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} className="text-txt3" />}
                    </button>
                  )}
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
                  {isAdmin && (
                    <div className="flex items-center">
                      {c.agentId && getAgentName(c.agentId) ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple/10 text-purple truncate">
                          {getAgentName(c.agentId)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-txt3 italic">Neprideleno</span>
                      )}
                    </div>
                  )}
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
                    {isAdmin && (
                      <button onClick={(e) => toggleCheck(c.id, e)} className="shrink-0">
                        {checked.has(c.id) ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} className="text-txt3" />}
                      </button>
                    )}
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
                        {isAdmin && c.agentId && getAgentName(c.agentId) && (
                          <span className="text-purple text-[10px] font-bold">{getAgentName(c.agentId)}</span>
                        )}
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
                {isAdmin && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-txt3">Agent</span>
                    <select
                      value={selected.agentId || ""}
                      onChange={async (e) => {
                        const newAgentId = e.target.value;
                        try {
                          const res = await fetch(`/api/contacts/${selected.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ agentId: newAgentId }),
                          });
                          if (!res.ok) throw new Error();
                          setSelected({ ...selected, agentId: newAgentId });
                          setContacts(p => p.map(c => c.id === selected.id ? { ...c, agentId: newAgentId } : c));
                        } catch {
                          setError("Nepodarilo se zmenit agenta");
                        }
                      }}
                      className="text-[10px] font-bold bg-transparent border-none p-0 pr-4 appearance-none cursor-pointer text-purple"
                    >
                      <option value="">Neprideleno</option>
                      {agents.filter(a => a.role === "agent").map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
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

              {isAdmin && (
                <div className="pt-3 border-t border-border">
                  <button onClick={() => deleteContact(selected.id)} className="text-xs text-red hover:text-red/80 transition-colors">
                    Smazat kontakt
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold flex items-center gap-2"><UserCheck size={18} className="text-purple" /> Pridelit kontakty</h3>
              <button onClick={() => setShowAssign(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-txt2">
                Vybrano <span className="font-bold text-txt">{checked.size}</span> kontaktu k prideleni
              </p>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-2 block">Pridelit agentovi</label>
                <div className="space-y-2">
                  {agents.filter(a => a.role === "agent" && a.active).map(a => (
                    <button
                      key={a.id}
                      onClick={() => setAssignAgent(a.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                        assignAgent === a.id
                          ? "border-purple bg-purple/10 text-purple"
                          : "border-border hover:border-purple/30 hover:bg-surface2/50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple/20 to-accent/20 flex items-center justify-center text-xs font-bold text-purple shrink-0">
                        {a.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{a.name}</div>
                        <div className="text-[10px] text-txt3">{a.email}</div>
                      </div>
                      {assignAgent === a.id && <CheckSquare size={16} className="ml-auto text-purple" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => { setShowAssign(false); setAssignAgent(""); }} className="btn-ghost text-sm">Zrusit</button>
              <button onClick={doAssign} disabled={!assignAgent || assigning} className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2">
                {assigning ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Prideluji...</>
                ) : (
                  <><UserCheck size={14} /> Pridelit {checked.size} kontaktu</>
                )}
              </button>
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
