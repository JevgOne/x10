"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Phone, Clock, Calendar, X, ChevronDown, PhoneIncoming, PhoneOutgoing } from "lucide-react";

interface Call {
  id: string;
  contactId: string;
  contactFirstName?: string;
  contactLastName?: string;
  agentName?: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  result: string;
  note: string;
  createdAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

const RESULT_LABELS: Record<string, string> = {
  answered: "Zvedl",
  not_answered: "Nezvedl",
  busy: "Obsazeno",
  voicemail: "Hlasova schranka",
  callback: "Zavolat zpet",
  interested: "Ma zajem",
  not_interested: "Nema zajem",
  deal: "Obchod",
};

const RESULT_COLORS: Record<string, string> = {
  answered: "bg-green/10 text-green",
  not_answered: "bg-red/10 text-red",
  busy: "bg-yellow/10 text-yellow",
  voicemail: "bg-purple/10 text-purple",
  callback: "bg-accent/10 text-accent",
  interested: "bg-green/10 text-green",
  not_interested: "bg-red/10 text-red",
  deal: "bg-green/10 text-green",
};

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const EMPTY_CALL = {
  contactId: "", date: "", time: "", duration: 0, type: "outbound", result: "answered", note: "",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_CALL);
  const [saving, setSaving] = useState(false);
  const [filterResult, setFilterResult] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [cRes, ctRes] = await Promise.all([
        fetch("/api/calls"),
        fetch("/api/contacts"),
      ]);
      if (!cRes.ok || !ctRes.ok) throw new Error("Chyba načítání dat");
      const cData = await cRes.json();
      const ctData = await ctRes.json();
      setCalls(cData.calls || []);
      setContacts(ctData.contacts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba načítání");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    const now = new Date();
    setForm({
      ...EMPTY_CALL,
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().slice(0, 5),
    });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
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

  const filtered = filterResult
    ? calls.filter((c) => c.result === filterResult)
    : calls;

  const totalDuration = calls.reduce((s, c) => s + (c.duration || 0), 0);
  const answeredCount = calls.filter((c) => ["answered", "interested", "deal"].includes(c.result)).length;
  const notAnsweredCount = calls.filter((c) => c.result === "not_answered").length;

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Hovory</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="text-sm pr-8 appearance-none">
              <option value="">Vsechny vysledky</option>
              {Object.entries(RESULT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
          </div>
          <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> <span className="hidden sm:inline">Novy hovor</span><span className="sm:hidden">Novy</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Celkem</div>
          <div className="text-xl font-bold">{calls.length}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Zvedl</div>
          <div className="text-xl font-bold text-green">{answeredCount}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Nezvedl</div>
          <div className="text-xl font-bold text-red">{notAnsweredCount}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Celkova doba</div>
          <div className="text-xl font-bold text-accent">{formatDuration(totalDuration)}</div>
        </div>
      </div>

      {/* Call result distribution bar */}
      {calls.length > 0 && (
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-3">Distribuce vysledku</div>
          <div className="flex rounded-lg overflow-hidden h-6">
            {Object.entries(RESULT_LABELS).map(([key]) => {
              const count = calls.filter((c) => c.result === key).length;
              if (count === 0) return null;
              const pct = (count / calls.length) * 100;
              const colors: Record<string, string> = {
                answered: "bg-green-500", not_answered: "bg-red-500", busy: "bg-yellow-500",
                voicemail: "bg-purple-500", callback: "bg-blue-500", interested: "bg-emerald-500",
                not_interested: "bg-orange-500", deal: "bg-cyan-500",
              };
              return (
                <div
                  key={key}
                  className={`${colors[key] || "bg-gray-500"} flex items-center justify-center transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${RESULT_LABELS[key]}: ${count}`}
                >
                  {pct > 8 && <span className="text-[9px] font-bold text-white">{Math.round(pct)}%</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(RESULT_LABELS).map(([key, label]) => {
              const count = calls.filter((c) => c.result === key).length;
              if (count === 0) return null;
              return (
                <span key={key} className="text-[10px] text-txt3">{label}: {count}</span>
              );
            })}
          </div>
        </div>
      )}

      {/* Call list */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_2fr] gap-2 px-4 py-3 text-[10px] font-semibold text-txt3 uppercase tracking-wider border-b border-border">
          <span>Kontakt</span>
          <span>Datum & cas</span>
          <span>Trvani</span>
          <span>Typ</span>
          <span>Vysledek</span>
          <span>Poznamka</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-txt3 text-sm">Zadne hovory</div>
        ) : (
          filtered.map((call) => (
            <div key={call.id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
              {/* Desktop table row */}
              <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_2fr] gap-2 px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center shrink-0">
                    <Phone size={11} className="text-accent" />
                  </div>
                  <span className="font-medium truncate">
                    {call.contactFirstName || call.contactLastName
                      ? `${call.contactFirstName || ""} ${call.contactLastName || ""}`.trim()
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-txt2">
                  <Calendar size={12} />
                  {call.date && new Date(call.date).toLocaleDateString("cs-CZ")}
                  {call.time && <span>{call.time}</span>}
                </div>
                <div className="flex items-center gap-1 text-xs text-txt2 font-mono">
                  <Clock size={12} />
                  {formatDuration(call.duration)}
                </div>
                <div className="flex items-center">
                  {call.type === "outbound" ? (
                    <span className="flex items-center gap-1 text-xs text-accent"><PhoneOutgoing size={12} /> Out</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-green"><PhoneIncoming size={12} /> In</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${RESULT_COLORS[call.result] || "bg-surface3 text-txt3"}`}>
                    {RESULT_LABELS[call.result] || call.result}
                  </span>
                </div>
                <div className="flex items-center text-xs text-txt2 truncate">{call.note || "—"}</div>
              </div>
              {/* Mobile card */}
              <div className="md:hidden px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center shrink-0">
                    <Phone size={13} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {call.contactFirstName || call.contactLastName
                          ? `${call.contactFirstName || ""} ${call.contactLastName || ""}`.trim()
                          : "—"}
                      </span>
                      {call.type === "outbound" ? (
                        <PhoneOutgoing size={12} className="text-accent shrink-0" />
                      ) : (
                        <PhoneIncoming size={12} className="text-green shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-txt3">
                      {call.date && <span>{new Date(call.date).toLocaleDateString("cs-CZ")}</span>}
                      {call.time && <span>{call.time}</span>}
                      <span className="font-mono">{formatDuration(call.duration)}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${RESULT_COLORS[call.result] || "bg-surface3 text-txt3"}`}>
                      {RESULT_LABELS[call.result] || call.result}
                    </span>
                  </div>
                </div>
                {call.note && (
                  <p className="mt-1.5 ml-12 text-xs text-txt3 truncate">{call.note}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New call modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">Novy hovor</h3>
              <button onClick={() => setShowModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Kontakt</label>
                <div className="relative">
                  <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} className="w-full appearance-none pr-8">
                    <option value="">Vyberte kontakt</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Datum</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Cas</label>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Trvani (sec)</label>
                  <input type="number" value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Typ</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full">
                    <option value="outbound">Odchozi</option>
                    <option value="inbound">Prichozi</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Vysledek</label>
                <div className="relative">
                  <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} className="w-full appearance-none pr-8">
                    {Object.entries(RESULT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Poznamka</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowModal(false)} className="btn-ghost text-sm">Zrusit</button>
              <button onClick={save} disabled={saving || !form.contactId} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukladani..." : "Ulozit hovor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
