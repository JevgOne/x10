"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ChevronRight, Phone, Mail, MapPin, Pencil, Send,
  PhoneOutgoing, CalendarPlus, Handshake, Clock, TrendingUp,
  Flame, Snowflake, X, FileText, PhoneIncoming, ArrowRightLeft,
  StickyNote, User2, Check,
} from "lucide-react";

interface Contact {
  id: string; firstName: string; lastName: string; phone: string; phoneAlt: string;
  email: string; dob: string; gender: string; address: string; city: string;
  zip: string; country: string; projectId: string; agentId: string; databaseId: string;
  pipelineStage: string; hotCold: string; potentialValue: number; occupation: string;
  competitiveIntel: string; note: string; createdAt: string; lastContactDate: string;
}

interface Call {
  id: string; date: string; time: string; duration: number; type: string;
  result: string; note: string; agentName: string;
}

interface Deal {
  id: string; product: string; amount: number; type: string; signDate: string;
  note: string; projectName: string; commissionAgent: number;
}

interface Callback {
  id: string; date: string; time: string; note: string; completed: boolean; agentName: string;
}

interface Activity {
  id: string; type: string; detail: string; previousValue: string;
  newValue: string; createdAt: string; agentName: string;
}

interface Project { id: string; name: string; }
interface Agent { id: string; name: string; role: string; }

const STAGE_LABELS: Record<string, string> = {
  novy: "Nový", kontaktovany: "Kontaktovaný", zajem: "Zájem", nabidka: "Nabídka",
  jednani: "Jednání", smlouva: "Smlouva", uzavreno: "Uzavřeno", ztraceno: "Ztraceno",
};

const STAGE_COLORS: Record<string, string> = {
  novy: "bg-blue-500/20 text-blue-400", kontaktovany: "bg-cyan-500/20 text-cyan-400",
  zajem: "bg-yellow-500/20 text-yellow-400", nabidka: "bg-orange-500/20 text-orange-400",
  jednani: "bg-purple-500/20 text-purple-400", smlouva: "bg-indigo-500/20 text-indigo-400",
  uzavreno: "bg-green-500/20 text-green-400", ztraceno: "bg-red-500/20 text-red-400",
};

const RESULT_LABELS: Record<string, string> = {
  answered: "Zvedl", not_answered: "Nezvedl", busy: "Obsazeno", voicemail: "Hlasovka",
  callback: "Callback", interested: "Zájem", not_interested: "Bez zájmu", deal: "Obchod",
};

const RESULT_COLORS: Record<string, string> = {
  answered: "text-green", not_answered: "text-red", busy: "text-yellow", voicemail: "text-purple",
  callback: "text-accent", interested: "text-emerald-400", not_interested: "text-orange-400", deal: "text-cyan-400",
};

function fmtDate(d: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("cs-CZ"); } catch { return d; }
}

function fmtCZK(n: number) {
  if (!n) return "";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
}

function fmtDuration(sec: number) {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);

  // Inline editing
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Notes
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState("timeline");

  // Quick action modals
  const [showCallModal, setShowCallModal] = useState(false);
  const [showCbModal, setShowCbModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Call form
  const [callForm, setCallForm] = useState({ result: "answered", duration: 0, note: "" });
  // Callback form
  const [cbForm, setCbForm] = useState({ date: "", time: "", note: "" });
  // Deal form
  const [dealForm, setDealForm] = useState({ product: "", amount: 0, type: "", note: "", projectId: "" });

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  const loadData = useCallback(async () => {
    try {
      const [meRes, contactRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/contacts/${id}`),
      ]);

      const meData = await meRes.json();
      setUser(meData.user || null);

      if (!contactRes.ok) {
        setError("Kontakt nenalezen");
        setLoading(false);
        return;
      }

      const contactData = await contactRes.json();
      setContact(contactData.contact);

      const [callsRes, dealsRes, cbRes, actRes, projRes] = await Promise.all([
        fetch(`/api/calls?contactId=${id}`),
        fetch(`/api/deals?contactId=${id}`),
        fetch(`/api/callbacks?contactId=${id}`),
        fetch(`/api/activity?contactId=${id}&limit=200`),
        fetch("/api/projects"),
      ]);

      if (callsRes.ok) setCalls((await callsRes.json()).calls || []);
      if (dealsRes.ok) setDeals((await dealsRes.json()).deals || []);
      if (cbRes.ok) setCallbacks((await cbRes.json()).callbacks || []);
      if (actRes.ok) setActivities((await actRes.json()).activities || []);
      if (projRes.ok) setProjects((await projRes.json()).projects || []);

      if (meData.user?.role !== "agent") {
        const agRes = await fetch("/api/users");
        if (agRes.ok) {
          const agData = await agRes.json();
          setAgents((agData.users || []).filter((u: Agent & { active: boolean }) => u.active));
        }
      }
    } catch {
      setError("Chyba načítání dat");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Inline edit ---
  const startEdit = (field: string, value: string) => {
    setEditField(field);
    setEditValue(value || "");
  };

  const saveEdit = async () => {
    if (!editField || !contact) return;
    const val = editValue;
    try {
      const body: Record<string, unknown> = {};
      body[editField] = editField === "potentialValue" ? Number(val) || 0 : val;
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setContact({ ...contact, [editField]: editField === "potentialValue" ? Number(val) || 0 : val } as Contact);
      }
    } catch { /* silently fail */ }
    setEditField(null);
  };

  const saveDropdown = async (field: string, value: string) => {
    if (!contact) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setContact({ ...contact, [field]: value } as Contact);
      }
    } catch { /* silently fail */ }
  };

  // --- Save note ---
  const saveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: id, type: "note", detail: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote("");
        const actRes = await fetch(`/api/activity?contactId=${id}&limit=200`);
        if (actRes.ok) setActivities((await actRes.json()).activities || []);
      }
    } catch { /* */ }
    setSavingNote(false);
  };

  // --- Quick actions ---
  const saveCall = async () => {
    setSaving(true);
    try {
      const now = new Date();
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: id, date: now.toISOString().split("T")[0],
          time: now.toTimeString().slice(0, 5), duration: callForm.duration,
          type: "outbound", result: callForm.result, note: callForm.note,
        }),
      });
      if (res.ok) {
        setShowCallModal(false);
        setCallForm({ result: "answered", duration: 0, note: "" });
        loadData();
      }
    } catch { setError("Chyba uložení hovoru"); }
    setSaving(false);
  };

  const saveCallback = async () => {
    if (!cbForm.date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: id, date: cbForm.date, time: cbForm.time, note: cbForm.note }),
      });
      if (res.ok) {
        setShowCbModal(false);
        setCbForm({ date: "", time: "", note: "" });
        loadData();
      }
    } catch { setError("Chyba uložení callbacku"); }
    setSaving(false);
  };

  const saveDeal = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: id, projectId: dealForm.projectId || contact?.projectId,
          product: dealForm.product, amount: dealForm.amount,
          type: dealForm.type, note: dealForm.note,
        }),
      });
      if (res.ok) {
        setShowDealModal(false);
        setDealForm({ product: "", amount: 0, type: "", note: "", projectId: "" });
        loadData();
      }
    } catch { setError("Chyba uložení dealu"); }
    setSaving(false);
  };

  const markCallbackDone = async (cbId: string) => {
    try {
      await fetch(`/api/callbacks/${cbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      setCallbacks(prev => prev.map(c => c.id === cbId ? { ...c, completed: true } : c));
    } catch { /* */ }
  };

  // --- Editable field helper ---
  const EditField = ({ label, field, value, type = "text" }: { label: string; field: string; value: string; type?: string }) => (
    <div className="flex justify-between items-center py-1.5 group">
      <span className="text-xs text-txt3 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 justify-end">
        {editField === field ? (
          <input
            autoFocus
            type={type === "tel" || type === "email" ? "text" : type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditField(null); }}
            onBlur={saveEdit}
            className="text-xs text-right w-44 py-0.5 px-2"
          />
        ) : (
          <>
            {type === "tel" && value ? (
              <a href={`tel:${value}`} className="text-xs text-txt2 hover:text-accent truncate">{value}</a>
            ) : type === "email" && value ? (
              <a href={`mailto:${value}`} className="text-xs text-txt2 hover:text-accent truncate">{value}</a>
            ) : (
              <span className="text-xs text-txt2 truncate">{value || "—"}</span>
            )}
            <button
              onClick={() => startEdit(field, value)}
              className="opacity-0 group-hover:opacity-100 text-txt3 hover:text-accent transition-all shrink-0"
            >
              <Pencil size={10} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  // --- Activity icon helper ---
  const actIcon = (type: string) => {
    switch (type) {
      case "call": return <PhoneIncoming size={14} className="text-accent" />;
      case "stage_change": return <ArrowRightLeft size={14} className="text-yellow" />;
      case "deal": return <Handshake size={14} className="text-green" />;
      case "assigned": return <User2 size={14} className="text-purple" />;
      case "note": return <StickyNote size={14} className="text-purple" />;
      default: return <Clock size={14} className="text-txt3" />;
    }
  };

  // --- Loading / Error ---
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-20 h-4 bg-surface2 rounded animate-pulse" />
          <ChevronRight size={12} className="text-txt3" />
          <div className="w-32 h-4 bg-surface2 rounded animate-pulse" />
        </div>
        <div className="glass rounded-2xl border border-border p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface2 animate-pulse" />
            <div className="space-y-2">
              <div className="w-48 h-5 bg-surface2 rounded animate-pulse" />
              <div className="w-32 h-3 bg-surface2 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-2xl border border-border p-5 space-y-3">
                <div className="w-24 h-3 bg-surface2 rounded animate-pulse" />
                {[1, 2, 3].map(j => <div key={j} className="w-full h-4 bg-surface2 rounded animate-pulse" />)}
              </div>
            ))}
          </div>
          <div className="glass rounded-2xl border border-border p-5">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full h-6 bg-surface2 rounded animate-pulse" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="max-w-7xl mx-auto">
        <Link href="/contacts" className="text-sm text-txt3 hover:text-accent flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Zpět na kontakty
        </Link>
        <div className="glass rounded-2xl border border-red/20 p-8 text-center">
          <p className="text-red">{error || "Kontakt nenalezen"}</p>
        </div>
      </div>
    );
  }

  const pendingCallbacks = callbacks.filter(c => !c.completed);
  const projectName = projects.find(p => p.id === contact.projectId)?.name;
  const agentName = agents.find(a => a.id === contact.agentId)?.name;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href="/contacts" className="text-txt3 hover:text-accent transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> Kontakty
        </Link>
        <ChevronRight size={12} className="text-txt3" />
        <span className="text-txt font-medium">{contact.firstName} {contact.lastName}</span>
      </div>

      {/* Header */}
      <div className="glass rounded-2xl border border-border p-5 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-xl font-bold text-accent shrink-0">
              {contact.firstName?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{contact.firstName} {contact.lastName}</h1>
                {contact.hotCold === "hot" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red/10 text-red border border-red/20 flex items-center gap-1"><Flame size={10} />HOT</span>}
                {contact.hotCold === "cold" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20 flex items-center gap-1"><Snowflake size={10} />COLD</span>}
                {contact.hotCold === "warm" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow/10 text-yellow border border-yellow/20">WARM</span>}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_COLORS[contact.pipelineStage] || "bg-surface3 text-txt3"}`}>
                  {STAGE_LABELS[contact.pipelineStage] || contact.pipelineStage}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-txt3">
                {contact.occupation && <span>{contact.occupation}</span>}
                {projectName && <span className="text-accent">{projectName}</span>}
                {agentName && <span className="text-purple">{agentName}</span>}
              </div>
              {contact.potentialValue > 0 && (
                <p className="text-sm text-green font-mono font-bold mt-1">{fmtCZK(contact.potentialValue)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-all font-medium">
                <Phone size={13} /> {contact.phone}
              </a>
            )}
            <button onClick={() => setShowCallModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all font-medium">
              <PhoneOutgoing size={13} /> Hovor
            </button>
            <button onClick={() => { setCbForm({ date: new Date().toISOString().split("T")[0], time: "10:00", note: "" }); setShowCbModal(true); }} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-yellow/10 text-yellow border border-yellow/20 hover:bg-yellow/20 transition-all font-medium">
              <CalendarPlus size={13} /> Callback
            </button>
            <button onClick={() => { setDealForm({ ...dealForm, projectId: contact.projectId || "" }); setShowDealModal(true); }} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-all font-medium hidden sm:flex">
              <Handshake size={13} /> Deal
            </button>
          </div>
        </div>
      </div>

      {/* Pending callbacks alert */}
      {pendingCallbacks.length > 0 && (
        <div className="mb-4 glass rounded-xl border border-yellow/20 px-4 py-3 flex items-center gap-3">
          <CalendarPlus size={16} className="text-yellow shrink-0" />
          <div className="flex-1 text-xs">
            <span className="font-medium text-yellow">{pendingCallbacks.length} naplánovaných callbacků</span>
            {" — "}
            nejbližší: {pendingCallbacks.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0]?.date}{" "}
            {pendingCallbacks.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0]?.time}
          </div>
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contact info */}
          <div className="glass rounded-2xl border border-border p-5">
            <h2 className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-3">Kontaktní údaje</h2>
            <div className="space-y-0.5 divide-y divide-border/30">
              <EditField label="Telefon" field="phone" value={contact.phone} type="tel" />
              <EditField label="Alt. telefon" field="phoneAlt" value={contact.phoneAlt} type="tel" />
              <EditField label="Email" field="email" value={contact.email} type="email" />
              <EditField label="Adresa" field="address" value={contact.address} />
              <EditField label="Město" field="city" value={contact.city} />
              <EditField label="PSČ" field="zip" value={contact.zip} />
              <EditField label="Země" field="country" value={contact.country} />
            </div>
          </div>

          {/* Pipeline */}
          <div className="glass rounded-2xl border border-border p-5">
            <h2 className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-3">Pipeline</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-txt3">Fáze</span>
                <select
                  value={contact.pipelineStage}
                  onChange={(e) => saveDropdown("pipelineStage", e.target.value)}
                  className="text-[11px] font-bold bg-transparent border-none p-0 pr-4 appearance-none cursor-pointer text-right"
                >
                  {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-txt3">Teplota</span>
                <select
                  value={contact.hotCold}
                  onChange={(e) => saveDropdown("hotCold", e.target.value)}
                  className="text-[11px] font-bold bg-transparent border-none p-0 pr-4 appearance-none cursor-pointer text-right"
                >
                  <option value="hot">HOT</option>
                  <option value="warm">WARM</option>
                  <option value="cold">COLD</option>
                </select>
              </div>
              <EditField label="Hodnota (CZK)" field="potentialValue" value={String(contact.potentialValue || 0)} type="number" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-txt3">Projekt</span>
                <select
                  value={contact.projectId || ""}
                  onChange={(e) => saveDropdown("projectId", e.target.value)}
                  className="text-[11px] bg-transparent border-none p-0 pr-4 appearance-none cursor-pointer text-accent text-right"
                >
                  <option value="">—</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-txt3">Agent</span>
                  <select
                    value={contact.agentId || ""}
                    onChange={(e) => saveDropdown("agentId", e.target.value)}
                    className="text-[11px] bg-transparent border-none p-0 pr-4 appearance-none cursor-pointer text-purple text-right"
                  >
                    <option value="">Nepřiděleno</option>
                    {agents.filter(a => a.role === "agent").map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="glass rounded-2xl border border-border p-5">
            <h2 className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-3">Poznámky</h2>
            {/* Main note */}
            {contact.note && (
              <div className="mb-3 p-3 rounded-xl bg-surface2/50 border border-border/50">
                {editField === "note" ? (
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setEditField(null); }}
                    onBlur={saveEdit}
                    rows={3}
                    className="w-full text-xs"
                  />
                ) : (
                  <div className="group cursor-pointer" onClick={() => startEdit("note", contact.note)}>
                    <p className="text-xs text-txt2 whitespace-pre-wrap">{contact.note}</p>
                    <Pencil size={10} className="text-txt3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            )}

            {/* Add note */}
            <div className="flex gap-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Přidat poznámku..."
                className="flex-1 text-xs"
                onKeyDown={(e) => e.key === "Enter" && saveNote()}
              />
              <button
                onClick={saveNote}
                disabled={savingNote || !newNote.trim()}
                className="px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-30"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Note history from activity */}
            {activities.filter(a => a.type === "note").length > 0 && (
              <div className="mt-3 space-y-2">
                {activities.filter(a => a.type === "note").map(a => (
                  <div key={a.id} className="pl-3 border-l-2 border-purple/30">
                    <p className="text-xs text-txt2">{a.detail}</p>
                    <p className="text-[10px] text-txt3 mt-0.5">{a.agentName} · {fmtDate(a.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional info */}
          <div className="glass rounded-2xl border border-border p-5">
            <h2 className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-3">Další informace</h2>
            <div className="space-y-0.5 divide-y divide-border/30">
              <EditField label="Datum narození" field="dob" value={contact.dob} type="date" />
              <EditField label="Pohlaví" field="gender" value={contact.gender} />
              <EditField label="Povolání" field="occupation" value={contact.occupation} />
              <EditField label="Konkurence" field="competitiveIntel" value={contact.competitiveIntel} />
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-txt3">Vytvořeno</span>
                <span className="text-xs text-txt2">{fmtDate(contact.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-txt3">Poslední kontakt</span>
                <span className="text-xs text-txt2">{fmtDate(contact.lastContactDate) || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 bg-surface rounded-xl p-1 border border-border overflow-x-auto">
            {[
              { key: "timeline", label: "Časová osa", count: activities.length },
              { key: "calls", label: "Hovory", count: calls.length },
              { key: "deals", label: "Dealy", count: deals.length },
              { key: "callbacks", label: "Callbacky", count: callbacks.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key ? "bg-accent/10 text-accent" : "text-txt3 hover:text-txt2"
                }`}
              >
                {tab.label} {tab.count > 0 && <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="glass rounded-2xl border border-border p-5">
            {/* TIMELINE */}
            {activeTab === "timeline" && (
              <div className="space-y-0">
                {activities.length === 0 ? (
                  <p className="text-sm text-txt3 text-center py-8">Žádná aktivita</p>
                ) : (
                  activities.map((a, i) => (
                    <div key={a.id} className="flex gap-3 pb-4 relative">
                      {/* Vertical line */}
                      {i < activities.length - 1 && (
                        <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border/50" />
                      )}
                      <div className="w-7 h-7 rounded-full bg-surface2 flex items-center justify-center shrink-0 z-10">
                        {actIcon(a.type)}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">
                            {a.type === "call" && "Hovor"}
                            {a.type === "stage_change" && "Změna fáze"}
                            {a.type === "deal" && "Nový deal"}
                            {a.type === "assigned" && "Přiřazení"}
                            {a.type === "note" && "Poznámka"}
                          </span>
                          {a.type === "stage_change" && a.previousValue && a.newValue && (
                            <span className="text-[10px] text-txt3">
                              {STAGE_LABELS[a.previousValue] || a.previousValue} → {STAGE_LABELS[a.newValue] || a.newValue}
                            </span>
                          )}
                        </div>
                        {a.detail && <p className="text-xs text-txt2 mt-0.5">{a.detail}</p>}
                        <p className="text-[10px] text-txt3 mt-0.5">{a.agentName} · {fmtDate(a.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CALLS */}
            {activeTab === "calls" && (
              <div className="space-y-2">
                {calls.length === 0 ? (
                  <p className="text-sm text-txt3 text-center py-8">Žádné hovory</p>
                ) : (
                  calls.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface2/30 border border-border/30">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Phone size={14} className="text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${RESULT_COLORS[c.result] || "text-txt2"}`}>
                            {RESULT_LABELS[c.result] || c.result}
                          </span>
                          <span className="text-[10px] text-txt3">{fmtDuration(c.duration)}</span>
                        </div>
                        {c.note && <p className="text-xs text-txt2 mt-0.5 truncate">{c.note}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-txt2">{fmtDate(c.date)}</div>
                        <div className="text-[10px] text-txt3">{c.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* DEALS */}
            {activeTab === "deals" && (
              <div className="space-y-2">
                {deals.length === 0 ? (
                  <p className="text-sm text-txt3 text-center py-8">Žádné dealy</p>
                ) : (
                  deals.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface2/30 border border-border/30">
                      <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center shrink-0">
                        <Handshake size={14} className="text-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{d.product || "Deal"}</span>
                          {d.projectName && <span className="text-[10px] text-accent">{d.projectName}</span>}
                        </div>
                        {d.note && <p className="text-xs text-txt2 mt-0.5 truncate">{d.note}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-mono font-bold text-green">{fmtCZK(d.amount)}</div>
                        <div className="text-[10px] text-txt3">{fmtDate(d.signDate)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CALLBACKS */}
            {activeTab === "callbacks" && (
              <div className="space-y-2">
                {callbacks.length === 0 ? (
                  <p className="text-sm text-txt3 text-center py-8">Žádné callbacky</p>
                ) : (
                  callbacks.map(cb => {
                    const isOverdue = !cb.completed && cb.date < new Date().toISOString().split("T")[0];
                    return (
                      <div key={cb.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                        cb.completed ? "bg-surface2/20 border-border/30 opacity-60" :
                        isOverdue ? "bg-red/5 border-red/20" : "bg-surface2/30 border-border/30"
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          cb.completed ? "bg-green/10" : isOverdue ? "bg-red/10" : "bg-yellow/10"
                        }`}>
                          {cb.completed ? <Check size={14} className="text-green" /> : <CalendarPlus size={14} className={isOverdue ? "text-red" : "text-yellow"} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{fmtDate(cb.date)} {cb.time}</span>
                            {cb.completed && <span className="text-[10px] text-green font-bold">Dokončeno</span>}
                            {isOverdue && <span className="text-[10px] text-red font-bold">Zpožděno</span>}
                          </div>
                          {cb.note && <p className="text-xs text-txt2 mt-0.5 truncate">{cb.note}</p>}
                        </div>
                        {!cb.completed && (
                          <button
                            onClick={() => markCallbackDone(cb.id)}
                            className="text-[10px] font-medium px-2 py-1 rounded-lg bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-all shrink-0"
                          >
                            Hotovo
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="glass rounded-xl border border-border p-3 text-center">
              <div className="text-lg font-bold text-accent">{calls.length}</div>
              <div className="text-[10px] text-txt3 uppercase">Hovorů</div>
            </div>
            <div className="glass rounded-xl border border-border p-3 text-center">
              <div className="text-lg font-bold text-green">{deals.length}</div>
              <div className="text-[10px] text-txt3 uppercase">Dealů</div>
            </div>
            <div className="glass rounded-xl border border-border p-3 text-center">
              <div className="text-lg font-bold text-yellow">{pendingCallbacks.length}</div>
              <div className="text-[10px] text-txt3 uppercase">Callbacků</div>
            </div>
          </div>
        </div>
      </div>

      {/* === MODALS === */}

      {/* Call modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold flex items-center gap-2"><PhoneOutgoing size={18} className="text-accent" /> Zapsat hovor</h3>
              <button onClick={() => setShowCallModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-2 block">Výsledek</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.entries(RESULT_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setCallForm({ ...callForm, result: key })}
                      className={`text-[10px] font-bold py-2 px-1 rounded-lg border transition-all ${
                        callForm.result === key ? `${RESULT_COLORS[key]} bg-surface2 border-current` : "border-border text-txt3 hover:border-border2"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Doba (sec)</label>
                <input
                  type="number"
                  value={callForm.duration || ""}
                  onChange={(e) => setCallForm({ ...callForm, duration: Number(e.target.value) })}
                  className="w-full"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Poznámka</label>
                <textarea
                  value={callForm.note}
                  onChange={(e) => setCallForm({ ...callForm, note: e.target.value })}
                  rows={2}
                  className="w-full"
                  placeholder="Poznámka k hovoru..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowCallModal(false)} className="btn-ghost text-sm">Zrušit</button>
              <button onClick={saveCall} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukládám..." : "Uložit hovor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Callback modal */}
      {showCbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold flex items-center gap-2"><CalendarPlus size={18} className="text-yellow" /> Nový callback</h3>
              <button onClick={() => setShowCbModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Datum</label>
                  <input
                    type="date"
                    value={cbForm.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setCbForm({ ...cbForm, date: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Čas</label>
                  <input
                    type="time"
                    value={cbForm.time}
                    onChange={(e) => setCbForm({ ...cbForm, time: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Poznámka</label>
                <textarea
                  value={cbForm.note}
                  onChange={(e) => setCbForm({ ...cbForm, note: e.target.value })}
                  rows={2}
                  className="w-full"
                  placeholder="Důvod callbacku..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowCbModal(false)} className="btn-ghost text-sm">Zrušit</button>
              <button onClick={saveCallback} disabled={saving || !cbForm.date} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukládám..." : "Vytvořit callback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal modal */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold flex items-center gap-2"><Handshake size={18} className="text-green" /> Nový deal</h3>
              <button onClick={() => setShowDealModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Produkt</label>
                <input
                  value={dealForm.product}
                  onChange={(e) => setDealForm({ ...dealForm, product: e.target.value })}
                  className="w-full"
                  placeholder="Název produktu"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Částka (CZK)</label>
                  <input
                    type="number"
                    value={dealForm.amount || ""}
                    onChange={(e) => setDealForm({ ...dealForm, amount: Number(e.target.value) })}
                    className="w-full"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Typ</label>
                  <select
                    value={dealForm.type}
                    onChange={(e) => setDealForm({ ...dealForm, type: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Vyberte</option>
                    <option value="jednorázový">Jednorázový</option>
                    <option value="pravidelný">Pravidelný</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Projekt</label>
                <select
                  value={dealForm.projectId}
                  onChange={(e) => setDealForm({ ...dealForm, projectId: e.target.value })}
                  className="w-full"
                >
                  <option value="">—</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Poznámka</label>
                <textarea
                  value={dealForm.note}
                  onChange={(e) => setDealForm({ ...dealForm, note: e.target.value })}
                  rows={2}
                  className="w-full"
                  placeholder="Poznámka k dealu..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowDealModal(false)} className="btn-ghost text-sm">Zrušit</button>
              <button onClick={saveDeal} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukládám..." : "Vytvořit deal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 z-50 bg-red/10 text-red border border-red/20 rounded-xl px-4 py-3 text-sm flex items-center gap-2 shadow-xl">
          {error}
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
