"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Calendar, Clock, X, ChevronDown, CheckCircle, Edit3, Trash2, AlertTriangle, PhoneForwarded } from "lucide-react";

interface Callback {
  id: string;
  contactId: string;
  agentId: string;
  contactFirstName?: string;
  contactLastName?: string;
  agentName?: string;
  date: string;
  time: string;
  note: string;
  completed: boolean;
  createdAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

const EMPTY_FORM = {
  contactId: "",
  date: "",
  time: "",
  note: "",
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function isOverdue(cb: Callback) {
  if (cb.completed) return false;
  const today = getToday();
  if (!cb.date) return false;
  if (cb.date < today) return true;
  if (cb.date === today && cb.time) {
    const now = new Date().toTimeString().slice(0, 5);
    return cb.time < now;
  }
  return false;
}

function isToday(cb: Callback) {
  return cb.date === getToday();
}

function sortCallbacks(list: Callback[]) {
  return [...list].sort((a, b) => {
    // Pending first
    if (!a.completed && b.completed) return -1;
    if (a.completed && !b.completed) return 1;
    // Then by date ascending
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    // Then by time ascending
    if ((a.time || "") < (b.time || "")) return -1;
    if ((a.time || "") > (b.time || "")) return 1;
    return 0;
  });
}

export default function CallbacksPage() {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "completed" | "today">("all");

  const load = useCallback(async () => {
    try {
      setError("");
      const [cbRes, ctRes] = await Promise.all([
        fetch("/api/callbacks"),
        fetch("/api/contacts"),
      ]);
      if (!cbRes.ok) throw new Error("Chyba pri nacitani callbacku");
      if (!ctRes.ok) throw new Error("Chyba pri nacitani kontaktu");
      const cbData = await cbRes.json();
      const ctData = await ctRes.json();
      setCallbacks(cbData.callbacks || []);
      setContacts(ctData.contacts || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Neznama chyba";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    const now = new Date();
    setForm({
      ...EMPTY_FORM,
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().slice(0, 5),
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (cb: Callback) => {
    setForm({
      contactId: cb.contactId || "",
      date: cb.date || "",
      time: cb.time || "",
      note: cb.note || "",
    });
    setEditingId(cb.id);
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const res = await fetch(`/api/callbacks/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Chyba pri aktualizaci callbacku");
      } else {
        const res = await fetch("/api/callbacks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Chyba pri vytvareni callbacku");
      }
      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Neznama chyba";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/callbacks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Chyba pri oznacovani jako dokonceno");
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Neznama chyba";
      setError(msg);
    }
  };

  const deleteCallback = async (id: string) => {
    if (!confirm("Opravdu smazat tento callback?")) return;
    setError("");
    try {
      const res = await fetch(`/api/callbacks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Chyba pri mazani callbacku");
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Neznama chyba";
      setError(msg);
    }
  };

  // Stats
  const today = getToday();
  const totalCount = callbacks.length;
  const pendingCount = callbacks.filter((cb) => !cb.completed).length;
  const completedCount = callbacks.filter((cb) => cb.completed).length;
  const todayCount = callbacks.filter((cb) => cb.date === today).length;

  // Filter
  const filtered = sortCallbacks(
    callbacks.filter((cb) => {
      if (filterTab === "pending") return !cb.completed;
      if (filterTab === "completed") return cb.completed;
      if (filterTab === "today") return cb.date === today;
      return true;
    })
  );

  const TABS: { key: typeof filterTab; label: string; count: number }[] = [
    { key: "all", label: "Vsechny", count: totalCount },
    { key: "pending", label: "Cekajici", count: pendingCount },
    { key: "completed", label: "Dokoncene", count: completedCount },
    { key: "today", label: "Dnesni", count: todayCount },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Callbacky</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> <span className="hidden sm:inline">Novy callback</span><span className="sm:hidden">Novy</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-xl border border-red/30 p-4 flex items-center gap-3 text-red text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red/60 hover:text-red"><X size={14} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Celkem</div>
          <div className="text-xl font-bold">{totalCount}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Cekajici</div>
          <div className="text-xl font-bold text-yellow">{pendingCount}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Dokoncene</div>
          <div className="text-xl font-bold text-green">{completedCount}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Dnesni</div>
          <div className="text-xl font-bold text-accent">{todayCount}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface2/50 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              filterTab === tab.key
                ? "bg-accent text-white shadow-lg"
                : "text-txt3 hover:text-txt2 hover:bg-surface3/50"
            }`}
          >
            {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Callback list */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_0.8fr_2fr_1fr_1.2fr] gap-2 px-4 py-3 text-[10px] font-semibold text-txt3 uppercase tracking-wider border-b border-border">
          <span>Kontakt</span>
          <span>Agent</span>
          <span>Datum</span>
          <span>Cas</span>
          <span>Poznamka</span>
          <span>Status</span>
          <span className="text-right">Akce</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-txt3 text-sm">Zadne callbacky</div>
        ) : (
          filtered.map((cb) => {
            const overdue = isOverdue(cb);
            const todayItem = isToday(cb) && !cb.completed;

            const rowBorder = overdue
              ? "border-l-2 border-l-red"
              : todayItem
              ? "border-l-2 border-l-accent"
              : "";

            const rowBg = overdue
              ? "bg-red/5"
              : todayItem
              ? "bg-accent/5"
              : "";

            const contactName =
              cb.contactFirstName || cb.contactLastName
                ? `${cb.contactFirstName || ""} ${cb.contactLastName || ""}`.trim()
                : "—";

            return (
              <div
                key={cb.id}
                className={`border-b border-border/50 hover:bg-surface2/50 transition-colors ${rowBorder} ${rowBg}`}
              >
                {/* Desktop table row */}
                <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_0.8fr_2fr_1fr_1.2fr] gap-2 px-4 py-3 text-sm items-center">
                  {/* Contact */}
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      overdue
                        ? "bg-gradient-to-br from-red/20 to-red/10"
                        : "bg-gradient-to-br from-accent/20 to-purple/20"
                    }`}>
                      <PhoneForwarded size={11} className={overdue ? "text-red" : "text-accent"} />
                    </div>
                    <span className="font-medium truncate">{contactName}</span>
                  </div>

                  {/* Agent */}
                  <div className="text-xs text-txt2 truncate">{cb.agentName || "—"}</div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-txt2">
                    <Calendar size={12} className="shrink-0" />
                    {cb.date ? new Date(cb.date + "T00:00:00").toLocaleDateString("cs-CZ") : "—"}
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1.5 text-xs text-txt2">
                    <Clock size={12} className="shrink-0" />
                    {cb.time || "—"}
                  </div>

                  {/* Note */}
                  <div className="text-xs text-txt2 truncate">{cb.note || "—"}</div>

                  {/* Status */}
                  <div className="flex items-center">
                    {cb.completed ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green/10 text-green">
                        Dokonceno
                      </span>
                    ) : overdue ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red/10 text-red">
                        Po terminu
                      </span>
                    ) : todayItem ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-accent/10 text-accent">
                        Dnes
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-yellow/10 text-yellow">
                        Cekajici
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {!cb.completed && (
                      <button
                        onClick={() => markComplete(cb.id)}
                        title="Oznacit jako dokonceno"
                        className="p-1.5 rounded-lg hover:bg-green/10 text-txt3 hover:text-green transition-colors"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(cb)}
                      title="Upravit"
                      className="p-1.5 rounded-lg hover:bg-accent/10 text-txt3 hover:text-accent transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteCallback(cb.id)}
                      title="Smazat"
                      className="p-1.5 rounded-lg hover:bg-red/10 text-txt3 hover:text-red transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      overdue
                        ? "bg-gradient-to-br from-red/20 to-red/10"
                        : "bg-gradient-to-br from-accent/20 to-purple/20"
                    }`}>
                      <PhoneForwarded size={13} className={overdue ? "text-red" : "text-accent"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{contactName}</span>
                        {cb.completed ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green/10 text-green shrink-0">
                            Dokonceno
                          </span>
                        ) : overdue ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red/10 text-red shrink-0">
                            Po terminu
                          </span>
                        ) : todayItem ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent shrink-0">
                            Dnes
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-yellow/10 text-yellow shrink-0">
                            Cekajici
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-txt3">
                        {cb.agentName && <span>{cb.agentName}</span>}
                        {cb.date && <span>{new Date(cb.date + "T00:00:00").toLocaleDateString("cs-CZ")}</span>}
                        {cb.time && <span>{cb.time}</span>}
                      </div>
                    </div>
                  </div>
                  {cb.note && (
                    <p className="mt-1.5 ml-12 text-xs text-txt3 truncate">{cb.note}</p>
                  )}
                  {/* Mobile actions */}
                  <div className="flex items-center gap-1 mt-2 ml-12">
                    {!cb.completed && (
                      <button
                        onClick={() => markComplete(cb.id)}
                        className="p-1.5 rounded-lg hover:bg-green/10 text-txt3 hover:text-green transition-colors"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(cb)}
                      className="p-1.5 rounded-lg hover:bg-accent/10 text-txt3 hover:text-accent transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteCallback(cb.id)}
                      className="p-1.5 rounded-lg hover:bg-red/10 text-txt3 hover:text-red transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New / Edit callback modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">{editingId ? "Upravit callback" : "Novy callback"}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Contact select */}
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Kontakt</label>
                <div className="relative">
                  <select
                    value={form.contactId}
                    onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                    className="w-full appearance-none pr-8"
                  >
                    <option value="">Vyberte kontakt</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Datum</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Cas</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Poznamka</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  className="w-full"
                  placeholder="Poznamka ke callbacku..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="btn-ghost text-sm">Zrusit</button>
              <button
                onClick={save}
                disabled={saving || !form.contactId}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? "Ukladani..." : editingId ? "Ulozit zmeny" : "Vytvorit callback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
