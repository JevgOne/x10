"use client";

import { useEffect, useState, useCallback, useRef, type DragEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PhoneForwarded,
  Phone,
  Handshake,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  Plus,
  Search,
  GripVertical,
  StickyNote,
  Trash2,
  Users,
  Filter,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── Types ─── */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface UserInfo { id: string; name: string; email: string; role: string; }

interface Callback {
  id: string; contactId: string; agentId: string;
  contactFirstName?: string; contactLastName?: string; agentName?: string;
  date: string; time: string; note: string; completed: boolean; createdAt: string;
}

interface Call {
  id: string; contactId: string; agentId: string;
  contactFirstName?: string; contactLastName?: string; agentName?: string;
  date: string; time: string; duration: number; type: string; result: string; note: string; createdAt: string;
}

interface Deal {
  id: string; contactId: string; agentId: string;
  contactFirstName?: string; contactLastName?: string; agentName?: string;
  projectName?: string; product: string; amount: number; signDate: string; note: string; createdAt: string;
}

interface CalendarNote {
  id: string; userId: string; userName?: string;
  date: string; text: string; color: string; createdAt: string;
}

interface ContactOption { id: string; firstName: string; lastName: string; phone?: string; }
interface AgentOption { id: string; name: string; }

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── Czech locale helpers ─── */
/* ═══════════════════════════════════════════════════════════════════════════ */

const DAY_NAMES_SHORT = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const MONTH_NAMES_GEN = ["Ledna","Února","Března","Dubna","Května","Června","Července","Srpna","Září","Října","Listopadu","Prosince"];
const DAY_NAMES_LONG = ["Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota","Neděle"];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getToday(): string { return toDateStr(new Date()); }
function getMondayIndex(d: Date): number { return (d.getDay()+6)%7; }

function getCalendarDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month+1, 0);
  const startPad = getMondayIndex(firstOfMonth);
  const rows = Math.ceil((startPad + lastOfMonth.getDate()) / 7);
  const days: Date[] = [];
  const startDate = new Date(year, month, 1 - startPad);
  for (let i = 0; i < rows*7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }
  return days;
}

function getWeekStart(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - getMondayIndex(copy));
  copy.setHours(0,0,0,0);
  return copy;
}

function cn(first?: string, last?: string): string {
  return (first || last) ? `${first || ""} ${last || ""}`.trim() : "—";
}

function fmtDur(s: number): string {
  if (!s) return "—";
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── Create Callback Modal ─── */
/* ═══════════════════════════════════════════════════════════════════════════ */

function CreateCallbackModal({ prefillDate, prefillTime, onClose, onCreated }: {
  prefillDate: string; prefillTime: string; onClose: () => void; onCreated: () => void;
}) {
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<ContactOption[]>([]);
  const [selected, setSelected] = useState<ContactOption | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [time, setTime] = useState(prefillTime);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setContactResults([]); setShowDrop(false); return; }
    timer.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=10`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setContactResults(data.contacts || []);
        setShowDrop(true);
      } catch { setContactResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
  }, []);

  const handleInput = (v: string) => { setContactSearch(v); setSelected(null); search(v); };
  const pick = (c: ContactOption) => {
    setSelected(c); setContactSearch(`${c.firstName||""} ${c.lastName||""}`.trim()); setShowDrop(false);
  };

  const submit = async () => {
    if (!selected) { setErr("Vyberte kontakt"); return; }
    if (!time) { setErr("Zadejte čas"); return; }
    setSubmitting(true); setErr("");
    try {
      const res = await fetch("/api/callbacks", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ contactId: selected.id, date: prefillDate, time, note }),
      });
      if (!res.ok) throw new Error("Chyba při vytváření callbacku");
      onCreated(); onClose();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Neznámá chyba"); }
    finally { setSubmitting(false); }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const dateObj = new Date(prefillDate + "T00:00:00");
  const label = `${DAY_NAMES_LONG[getMondayIndex(dateObj)]} ${dateObj.getDate()}. ${MONTH_NAMES_GEN[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass rounded-2xl border border-border p-6 space-y-5 animate-in shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Nový callback</h3>
            <p className="text-xs text-txt3 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface2 text-txt3 hover:text-txt transition-colors"><X size={18}/></button>
        </div>

        {err && (
          <div className="rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-red flex items-center gap-2">
            <AlertTriangle size={14}/><span>{err}</span>
          </div>
        )}

        {/* Contact search */}
        <div className="space-y-1.5" ref={dropRef}>
          <label className="text-xs font-semibold text-txt3">Kontakt</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3"/>
            <input type="text" value={contactSearch} onChange={e=>handleInput(e.target.value)} placeholder="Hledat kontakt..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface2/50 border border-border text-sm placeholder:text-txt3/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"/>
            {searchLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin"/></div>}
          </div>
          {showDrop && contactResults.length > 0 && (
            <div className="glass rounded-xl border border-border max-h-40 overflow-y-auto shadow-xl">
              {contactResults.map(c => (
                <button key={c.id} onClick={()=>pick(c)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent/5 transition-colors flex items-center gap-2 border-b border-border/30 last:border-b-0">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-accent">{(c.firstName?.[0]||c.lastName?.[0]||"?").toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{c.firstName||""} {c.lastName||""}</span>
                    {c.phone && <span className="text-[10px] text-txt3">{c.phone}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {showDrop && contactResults.length===0 && contactSearch.trim() && !searchLoading && (
            <div className="text-xs text-txt3 px-2 py-1.5">Žádné kontakty nenalezeny</div>
          )}
          {selected && (
            <div className="flex items-center gap-2 text-xs text-accent bg-accent/5 rounded-lg px-2.5 py-1.5">
              <CheckCircle size={12}/><span className="font-medium">{selected.firstName} {selected.lastName}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-txt3">Čas</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-surface2/50 border border-border text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"/>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-txt3">Poznámka</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Volitelná poznámka..." rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-surface2/50 border border-border text-sm placeholder:text-txt3/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors resize-none"/>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-txt3 hover:bg-surface2 border border-border transition-colors">Zrušit</button>
          <button onClick={submit} disabled={submitting||!selected}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg">
            {submitting ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Ukládám...</span> : "Vytvořit callback"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── Main Calendar Component ─── */
/* ═══════════════════════════════════════════════════════════════════════════ */

type ViewMode = "month" | "week" | "day";
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7..19

export default function CalendarPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [filterAgent, setFilterAgent] = useState<string>(""); // "" = my own / all (for admin)

  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [calNotes, setCalNotes] = useState<CalendarNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create callback modal
  const [createModal, setCreateModal] = useState<{ date: string; time: string } | null>(null);

  // Note inline form
  const [noteDate, setNoteDate] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // Drag & drop
  const [draggedCb, setDraggedCb] = useState<Callback | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const today = getToday();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  /* ─── Load user ─── */
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
    }).catch(() => {});
  }, []);

  /* ─── Load agents list (admin only) ─── */
  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "supervisor")) return;
    fetch("/api/users").then(r => r.json()).then(d => {
      setAgents((d.users || []).filter((u: Record<string, string>) => u.role === "agent" || u.role === "supervisor").map((u: Record<string, string>) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, [user]);

  /* ─── Data fetching ─── */
  const loadData = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const [cbRes, clRes, dlRes, noteRes] = await Promise.all([
        fetch("/api/callbacks"),
        fetch("/api/calls"),
        fetch("/api/deals"),
        fetch("/api/calendar-notes"),
      ]);
      if (!cbRes.ok) throw new Error("Chyba při načítání callbacků");
      if (!clRes.ok) throw new Error("Chyba při načítání hovorů");
      if (!dlRes.ok) throw new Error("Chyba při načítání dealů");
      const [cbData, clData, dlData, noteData] = await Promise.all([
        cbRes.json(), clRes.json(), dlRes.json(), noteRes.ok ? noteRes.json() : { notes: [] },
      ]);
      setCallbacks(cbData.callbacks || []);
      setCalls(clData.calls || []);
      setDeals(dlData.deals || []);
      setCalNotes(noteData.notes || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Neznámá chyba");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── Filtered data (admin can filter by agent) ─── */
  const filteredCallbacks = filterAgent
    ? callbacks.filter(cb => cb.agentId === filterAgent)
    : callbacks;
  const filteredCalls = filterAgent
    ? calls.filter(c => c.agentId === filterAgent)
    : calls;
  const filteredDeals = filterAgent
    ? deals.filter(d => d.agentId === filterAgent)
    : deals;

  /* ─── Mark callback complete ─── */
  const markComplete = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/callbacks/${id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({completed:true}) });
      if (!res.ok) throw new Error("Chyba");
      loadData();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Neznámá chyba"); }
  };

  /* ─── Delete callback ─── */
  const deleteCallback = async (id: string) => {
    try {
      await fetch(`/api/callbacks/${id}`, { method: "DELETE" });
      loadData();
    } catch { /* ignore */ }
  };

  /* ─── Calendar notes ─── */
  const saveNote = async () => {
    if (!noteDate || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch("/api/calendar-notes", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ date: noteDate, text: noteText }),
      });
      if (!res.ok) throw new Error("Chyba");
      setNoteDate(null); setNoteText("");
      loadData();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Neznámá chyba"); }
    setNoteSaving(false);
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/calendar-notes?id=${id}`, { method: "DELETE" });
      loadData();
    } catch { /* ignore */ }
  };

  /* ─── Drag & drop ─── */
  const handleDragStart = (e: DragEvent, cb: Callback) => {
    if (cb.completed) { e.preventDefault(); return; }
    setDraggedCb(cb);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cb.id);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "0.5";
  };
  const handleDragEnd = (e: DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "1";
    setDraggedCb(null); setDropTarget(null);
  };
  const handleDragOver = (e: DragEvent, key: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget(key);
  };
  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = async (e: DragEvent, targetDate: string, targetHour?: number) => {
    e.preventDefault(); setDropTarget(null);
    if (!draggedCb) return;
    const newTime = targetHour !== undefined
      ? `${String(targetHour).padStart(2,"0")}:${draggedCb.time?.split(":")[1]||"00"}`
      : draggedCb.time;
    if (targetDate === draggedCb.date && newTime === draggedCb.time) { setDraggedCb(null); return; }
    try {
      const body: Record<string,string> = { date: targetDate };
      if (targetHour !== undefined) body.time = newTime;
      const res = await fetch(`/api/callbacks/${draggedCb.id}`, {
        method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Chyba při přesunu");
      loadData();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Neznámá chyba"); }
    setDraggedCb(null);
  };

  /* ─── Event helpers ─── */
  const cbByDate = (ds: string) => filteredCallbacks.filter(cb => cb.date === ds);
  const clByDate = (ds: string) => filteredCalls.filter(c => c.date === ds);
  const dlByDate = (ds: string) => filteredDeals.filter(d => d.signDate === ds);
  const notesByDate = (ds: string) => calNotes.filter(n => n.date === ds);

  /* ─── Navigation ─── */
  const goToday = () => { setCurrentDate(new Date()); setSelectedDay(null); };
  const goPrev = () => {
    if (view==="month") setCurrentDate(new Date(year,month-1,1));
    else if (view==="week") { const ws=getWeekStart(currentDate); ws.setDate(ws.getDate()-7); setCurrentDate(ws); }
    else { const d=new Date(currentDate); d.setDate(d.getDate()-1); setCurrentDate(d); }
    setSelectedDay(null);
  };
  const goNext = () => {
    if (view==="month") setCurrentDate(new Date(year,month+1,1));
    else if (view==="week") { const ws=getWeekStart(currentDate); ws.setDate(ws.getDate()+7); setCurrentDate(ws); }
    else { const d=new Date(currentDate); d.setDate(d.getDate()+1); setCurrentDate(d); }
    setSelectedDay(null);
  };

  const headerLabel = (() => {
    if (view==="month") return `${MONTH_NAMES[month]} ${year}`;
    if (view==="week") {
      const ws=getWeekStart(currentDate), we=new Date(ws);
      we.setDate(we.getDate()+6);
      const fmt=(d:Date)=>`${d.getDate()}. ${d.getMonth()+1}.`;
      return `${fmt(ws)} – ${fmt(we)} ${we.getFullYear()}`;
    }
    const di=getMondayIndex(currentDate);
    return `${DAY_NAMES_LONG[di]} ${currentDate.getDate()}. ${MONTH_NAMES_GEN[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  })();

  const openCreate = (date: string, hour?: number) => {
    setCreateModal({ date, time: hour !== undefined ? `${String(hour).padStart(2,"0")}:00` : "09:00" });
  };

  /* ─── Loading ─── */
  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"/></div>;

  const calendarDays = getCalendarDays(year, month);
  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({length:7}, (_,i) => { const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });

  /* ─── Callback pill (draggable) ─── */
  const pill = (cb: Callback, showAgent = false) => (
    <div key={cb.id} draggable={!cb.completed} onDragStart={e=>handleDragStart(e,cb)} onDragEnd={handleDragEnd}
      className={`group/pill text-[10px] px-1.5 py-0.5 rounded truncate ${
        cb.completed ? "bg-green/10 text-green" : "bg-accent/10 text-accent"
      } ${!cb.completed?"cursor-grab active:cursor-grabbing":""} ${draggedCb?.id===cb.id?"opacity-50 ring-1 ring-accent/30":""}`}>
      {!cb.completed && <GripVertical size={8} className="inline-block mr-0.5 opacity-0 group-hover/pill:opacity-60 transition-opacity align-middle"/>}
      {cb.time && <span className="font-semibold">{cb.time} </span>}
      {cn(cb.contactFirstName, cb.contactLastName)}
      {showAgent && cb.agentName && <span className="text-txt3 ml-1">({cb.agentName})</span>}
    </div>
  );

  /* ─── Note pill ─── */
  const notePill = (n: CalendarNote) => (
    <div key={n.id} className="group/note text-[10px] px-1.5 py-0.5 rounded truncate bg-purple/10 text-purple flex items-center gap-1">
      <StickyNote size={8} className="shrink-0"/>
      <span className="truncate">{n.text}</span>
      {n.userName && isAdmin && <span className="text-txt3 ml-0.5">({n.userName})</span>}
      <button onClick={e=>{e.stopPropagation();deleteNote(n.id);}} className="ml-auto opacity-0 group-hover/note:opacity-100 hover:text-red transition-all shrink-0"><Trash2 size={8}/></button>
    </div>
  );

  /* ─── Day detail panel ─── */
  const renderDayDetail = (dateStr: string) => {
    const dayCbs = cbByDate(dateStr).sort((a,b) => (a.time||"").localeCompare(b.time||""));
    const dayCalls = clByDate(dateStr).sort((a,b) => (a.time||"").localeCompare(b.time||""));
    const dayDeals = dlByDate(dateStr);
    const dayNotes = notesByDate(dateStr);
    const dateObj = new Date(dateStr+"T00:00:00");
    const label = `${DAY_NAMES_LONG[getMondayIndex(dateObj)]} ${dateObj.getDate()}. ${MONTH_NAMES[dateObj.getMonth()]}`;
    const isEmpty = dayCbs.length===0 && dayCalls.length===0 && dayDeals.length===0 && dayNotes.length===0;

    return (
      <div className="glass rounded-2xl border border-border p-4 md:p-5 space-y-4 animate-in">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">{label}</h3>
          <div className="flex items-center gap-1">
            <button onClick={()=>{ setNoteDate(noteDate===dateStr?null:dateStr); setNoteText(""); }} title="Přidat poznámku"
              className="p-1.5 rounded-lg hover:bg-purple/10 text-txt3 hover:text-purple transition-colors"><StickyNote size={14}/></button>
            <button onClick={()=>openCreate(dateStr)} title="Nový callback"
              className="p-1.5 rounded-lg hover:bg-accent/10 text-txt3 hover:text-accent transition-colors"><Plus size={16}/></button>
            <button onClick={()=>setSelectedDay(null)}
              className="p-1.5 rounded-lg hover:bg-surface2 text-txt3 hover:text-txt transition-colors"><X size={16}/></button>
          </div>
        </div>

        {/* Inline note form */}
        {noteDate === dateStr && (
          <div className="flex items-center gap-2">
            <input type="text" value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Poznámka na tento den..."
              onKeyDown={e=>{ if(e.key==="Enter") saveNote(); if(e.key==="Escape") setNoteDate(null); }}
              className="flex-1 px-3 py-2 rounded-xl bg-surface2/50 border border-border text-sm placeholder:text-txt3/50 focus:outline-none focus:border-purple/50 transition-colors" autoFocus/>
            <button onClick={saveNote} disabled={noteSaving||!noteText.trim()}
              className="px-3 py-2 rounded-xl bg-purple/10 text-purple text-xs font-semibold hover:bg-purple/20 disabled:opacity-40 transition-colors">
              {noteSaving?"...":"Uložit"}
            </button>
          </div>
        )}

        {/* Notes */}
        {dayNotes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-purple"/>
              <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">Poznámky ({dayNotes.length})</span>
            </div>
            <div className="space-y-1.5">
              {dayNotes.map(n => (
                <div key={n.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-purple/5">
                  <StickyNote size={14} className="text-purple shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <span className="block">{n.text}</span>
                    {isAdmin && n.userName && <span className="text-[10px] text-txt3">{n.userName}</span>}
                  </div>
                  <button onClick={()=>deleteNote(n.id)} title="Smazat"
                    className="p-1.5 rounded-lg hover:bg-red/10 text-txt3 hover:text-red transition-colors opacity-0 group-hover:opacity-100 shrink-0"><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEmpty && !noteDate && <p className="text-txt3 text-sm py-4 text-center">Žádné události pro tento den</p>}

        {/* Callbacks */}
        {dayCbs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-accent"/>
              <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">Callbacky ({dayCbs.length})</span>
            </div>
            <div className="space-y-1.5">
              {dayCbs.map(cb => (
                <div key={cb.id} draggable={!cb.completed} onDragStart={e=>handleDragStart(e,cb)} onDragEnd={handleDragEnd}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${cb.completed?"bg-green/5":"bg-accent/5 hover:bg-accent/10"} ${draggedCb?.id===cb.id?"opacity-30":""}`}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center shrink-0">
                    <PhoneForwarded size={11} className="text-accent"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{cn(cb.contactFirstName, cb.contactLastName)}</span>
                      {cb.completed
                        ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green/10 text-green shrink-0">Dokončeno</span>
                        : <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent shrink-0">Čekající</span>}
                      {isAdmin && cb.agentName && <span className="text-[10px] text-txt3 shrink-0">{cb.agentName}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                      {cb.time && <span className="flex items-center gap-1"><Clock size={10}/> {cb.time}</span>}
                      {cb.note && <span className="truncate">{cb.note}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!cb.completed && <button onClick={()=>markComplete(cb.id)} title="Dokončit"
                      className="p-1.5 rounded-lg hover:bg-green/10 text-txt3 hover:text-green transition-colors"><CheckCircle size={14}/></button>}
                    <button onClick={()=>deleteCallback(cb.id)} title="Smazat"
                      className="p-1.5 rounded-lg hover:bg-red/10 text-txt3 hover:text-red transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calls */}
        {dayCalls.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green"/>
              <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">Hovory ({dayCalls.length})</span>
            </div>
            <div className="space-y-1.5">
              {dayCalls.map(cl => (
                <div key={cl.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-green/5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green/20 to-green/10 flex items-center justify-center shrink-0"><Phone size={11} className="text-green"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{cn(cl.contactFirstName, cl.contactLastName)}</span>
                      {isAdmin && cl.agentName && <span className="text-[10px] text-txt3">{cl.agentName}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                      {cl.time && <span className="flex items-center gap-1"><Clock size={10}/> {cl.time}</span>}
                      {cl.result && <span>{cl.result}</span>}
                      <span>{fmtDur(cl.duration)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deals */}
        {dayDeals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400"/>
              <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">Dealy ({dayDeals.length})</span>
            </div>
            <div className="space-y-1.5">
              {dayDeals.map(dl => (
                <div key={dl.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-cyan-400/5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400/20 to-cyan-400/10 flex items-center justify-center shrink-0"><Handshake size={11} className="text-cyan-400"/></div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{cn(dl.contactFirstName, dl.contactLastName)}</span>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                      {dl.product && <span>{dl.product}</span>}
                      {dl.amount > 0 && <span className="font-medium text-cyan-400">{dl.amount.toLocaleString("cs-CZ")} Kč</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* RENDER */
  /* ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Kalendář</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Admin agent filter */}
          {isAdmin && agents.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-txt3"/>
              <select value={filterAgent} onChange={e=>setFilterAgent(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-xl bg-surface2/50 border border-border text-txt focus:outline-none focus:border-accent/50 transition-colors">
                <option value="">Všichni operátoři</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <button onClick={()=>openCreate(today)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20">
            <Plus size={14}/> Nový callback
          </button>

          <div className="flex gap-0.5 bg-surface2/50 rounded-xl p-0.5">
            {(["month","week","day"] as const).map(v => (
              <button key={v} onClick={()=>setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view===v?"bg-accent text-white shadow-lg":"text-txt3 hover:text-txt2"}`}>
                {v==="month"?"Měsíc":v==="week"?"Týden":"Den"}
              </button>
            ))}
          </div>

          <button onClick={goToday} className="btn-ghost text-xs px-3 py-1.5">Dnes</button>
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="glass rounded-xl border border-red/30 p-4 flex items-center gap-3 text-red text-sm">
          <AlertTriangle size={16} className="shrink-0"/><span>{error}</span>
          <button onClick={()=>setError("")} className="ml-auto text-red/60 hover:text-red"><X size={14}/></button>
        </div>
      )}

      {/* ─── Navigation ─── */}
      <div className="flex items-center justify-between">
        <button onClick={goPrev} className="p-2 rounded-xl hover:bg-surface2 text-txt3 hover:text-txt transition-colors"><ChevronLeft size={20}/></button>
        <span className="text-sm font-semibold">{headerLabel}</span>
        <button onClick={goNext} className="p-2 rounded-xl hover:bg-surface2 text-txt3 hover:text-txt transition-colors"><ChevronRight size={20}/></button>
      </div>

      {/* ─── Legend ─── */}
      <div className="flex items-center gap-4 text-[11px] text-txt3">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent"/> Callbacky</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green"/> Hovory</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400"/> Dealy</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple"/> Poznámky</span>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ─── MONTH VIEW ─── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {view === "month" && (
        <>
          <div className="glass rounded-2xl border border-border overflow-hidden hidden md:block">
            <div className="grid grid-cols-7 border-b border-border">
              {DAY_NAMES_SHORT.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-txt3 uppercase tracking-wider py-2.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const ds = toDateStr(day);
                const isCur = day.getMonth() === month;
                const isT = ds === today;
                const isSel = ds === selectedDay;
                const dayCbs = cbByDate(ds);
                const dayNotes = notesByDate(ds);
                const dayClLen = clByDate(ds).length;
                const dayDlLen = dlByDate(ds).length;
                const has = dayCbs.length>0 || dayClLen>0 || dayDlLen>0 || dayNotes.length>0;
                const isDrop = dropTarget === ds;

                return (
                  <div key={i} onClick={()=>setSelectedDay(isSel?null:ds)} onDoubleClick={()=>openCreate(ds)}
                    onDragOver={e=>handleDragOver(e,ds)} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,ds)}
                    className={`min-h-[100px] border-b border-r border-border/50 p-1.5 cursor-pointer transition-colors ${
                      isCur?"":"opacity-30"} ${isSel?"bg-accent/5":"hover:bg-surface2/50"} ${isDrop?"bg-accent/10 ring-2 ring-accent/30 ring-inset":""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-7 h-7 flex items-center justify-center text-xs font-semibold rounded-full ${isT?"bg-accent text-white":"text-txt2"}`}>
                        {day.getDate()}
                      </span>
                      {has && <div className="flex gap-0.5">
                        {dayCbs.length>0 && <span className="w-1.5 h-1.5 rounded-full bg-accent"/>}
                        {dayClLen>0 && <span className="w-1.5 h-1.5 rounded-full bg-green"/>}
                        {dayDlLen>0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"/>}
                        {dayNotes.length>0 && <span className="w-1.5 h-1.5 rounded-full bg-purple"/>}
                      </div>}
                    </div>
                    <div className="space-y-0.5">
                      {dayCbs.slice(0,2).map(cb => pill(cb, isAdmin && !filterAgent))}
                      {dayCbs.length>2 && <div className="text-[10px] text-accent/60 px-1.5">+{dayCbs.length-2}</div>}
                      {dayClLen>0 && <div className="text-[10px] px-1.5 py-0.5 rounded bg-green/10 text-green truncate">{dayClLen} {dayClLen===1?"hovor":dayClLen<5?"hovory":"hovorů"}</div>}
                      {dayDlLen>0 && <div className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 truncate">{dayDlLen} {dayDlLen===1?"deal":dayDlLen<5?"dealy":"dealů"}</div>}
                      {dayNotes.slice(0,1).map(n => notePill(n))}
                      {dayNotes.length>1 && <div className="text-[10px] text-purple/60 px-1.5">+{dayNotes.length-1} pozn.</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile month */}
          <div className="md:hidden space-y-2">
            {calendarDays.filter(d=>d.getMonth()===month).map((day,i) => {
              const ds=toDateStr(day), isT=ds===today;
              const dayCbs=cbByDate(ds), dayClLen=clByDate(ds).length, dayDlLen=dlByDate(ds).length, dayNLen=notesByDate(ds).length;
              const has=dayCbs.length>0||dayClLen>0||dayDlLen>0||dayNLen>0;
              const isSel=ds===selectedDay, di=getMondayIndex(day);
              if (!has && !isT) return null;
              return (
                <div key={i} onClick={()=>setSelectedDay(isSel?null:ds)}
                  className={`glass rounded-xl border border-border p-3 cursor-pointer transition-colors ${isSel?"bg-accent/5 border-accent/20":"hover:bg-surface2/50"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${isT?"bg-accent text-white":"bg-surface2"}`}>
                      <span className="text-[10px] font-semibold leading-none">{DAY_NAMES_SHORT[di]}</span>
                      <span className="text-sm font-bold leading-none mt-0.5">{day.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {dayCbs.length>0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent">{dayCbs.length} cb</span>}
                        {dayClLen>0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green/10 text-green">{dayClLen} hov.</span>}
                        {dayDlLen>0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-400/10 text-cyan-400">{dayDlLen} deal</span>}
                        {dayNLen>0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple/10 text-purple">{dayNLen} pozn.</span>}
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();openCreate(ds);}} className="p-2 rounded-lg hover:bg-accent/10 text-txt3 hover:text-accent transition-colors shrink-0"><Plus size={16}/></button>
                  </div>
                  {isSel && <div className="mt-3">{renderDayDetail(ds)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ─── WEEK VIEW ─── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {view === "week" && (
        <>
          <div className="glass rounded-2xl border border-border overflow-hidden hidden md:block">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
              <div className="border-r border-border/50"/>
              {weekDays.map((day,i) => {
                const ds=toDateStr(day), isT=ds===today;
                return (
                  <div key={i} className={`text-center py-3 border-r border-border/50 last:border-r-0 ${isT?"bg-accent/5":""}`}>
                    <div className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">{DAY_NAMES_SHORT[i]}</div>
                    <div className={`text-sm font-bold mt-0.5 ${isT?"w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center mx-auto":"text-txt2"}`}>{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="relative">
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30">
                  <div className="text-[10px] text-txt3 text-right pr-2 py-3 border-r border-border/50">{String(hour).padStart(2,"0")}:00</div>
                  {weekDays.map((day,di) => {
                    const ds=toDateStr(day), isT=ds===today, hs=String(hour).padStart(2,"0"), tk=`${ds}|${hour}`;
                    const hCbs=cbByDate(ds).filter(cb=>cb.time&&cb.time.startsWith(hs+":"));
                    const hCls=clByDate(ds).filter(c=>c.time&&c.time.startsWith(hs+":"));
                    const isDrop=dropTarget===tk;
                    return (
                      <div key={di} onClick={()=>setSelectedDay(ds)} onDoubleClick={()=>openCreate(ds,hour)}
                        onDragOver={e=>handleDragOver(e,tk)} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,ds,hour)}
                        className={`min-h-[48px] border-r border-border/30 last:border-r-0 p-0.5 cursor-pointer transition-colors ${isT?"bg-accent/[0.02]":""} hover:bg-surface2/30 ${isDrop?"bg-accent/10 ring-2 ring-accent/30 ring-inset":""}`}>
                        {hCbs.map(cb=>pill(cb, isAdmin && !filterAgent))}
                        {hCls.map(cl => (
                          <div key={cl.id} className="text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate bg-green/10 text-green">
                            <span className="font-semibold">{cl.time}</span> {cn(cl.contactFirstName,cl.contactLastName)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {weekDays.some(d=>dlByDate(toDateStr(d)).length>0) && (
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-t border-border">
                <div className="text-[10px] text-txt3 text-right pr-2 py-3 border-r border-border/50">Dealy</div>
                {weekDays.map((day,di) => {
                  const dayDeals=dlByDate(toDateStr(day));
                  return (
                    <div key={di} className="border-r border-border/30 last:border-r-0 p-0.5">
                      {dayDeals.map(dl => (
                        <div key={dl.id} className="text-[10px] px-1.5 py-1 rounded mb-0.5 truncate bg-cyan-400/10 text-cyan-400">
                          {cn(dl.contactFirstName,dl.contactLastName)}
                          {dl.amount>0 && <span className="font-semibold ml-1">{dl.amount.toLocaleString("cs-CZ")} Kč</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile week */}
          <div className="md:hidden space-y-2">
            {weekDays.map((day,i) => {
              const ds=toDateStr(day), isT=ds===today;
              const dayCbs=cbByDate(ds), dayClLen=clByDate(ds).length, dayDlLen=dlByDate(ds).length;
              const has=dayCbs.length>0||dayClLen>0||dayDlLen>0;
              const isSel=ds===selectedDay;
              return (
                <div key={i} onClick={()=>setSelectedDay(isSel?null:ds)}
                  className={`glass rounded-xl border border-border p-3 cursor-pointer transition-colors ${isSel?"bg-accent/5 border-accent/20":"hover:bg-surface2/50"} ${!has&&!isT?"opacity-40":""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${isT?"bg-accent text-white":"bg-surface2"}`}>
                      <span className="text-[10px] font-semibold leading-none">{DAY_NAMES_SHORT[i]}</span>
                      <span className="text-sm font-bold leading-none mt-0.5">{day.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {has ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {dayCbs.length>0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent">{dayCbs.length} cb</span>}
                          {dayClLen>0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green/10 text-green">{dayClLen} hov.</span>}
                          {dayDlLen>0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-400/10 text-cyan-400">{dayDlLen} deal</span>}
                        </div>
                      ) : <span className="text-xs text-txt3">Žádné události</span>}
                    </div>
                  </div>
                  {isSel && has && <div className="mt-3">{renderDayDetail(ds)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ─── DAY VIEW ─── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {view === "day" && (() => {
        const ds = toDateStr(currentDate), isT = ds===today;
        const dayCbs=cbByDate(ds), dayCalls_=clByDate(ds), dayDeals=dlByDate(ds), dayNotes=notesByDate(ds);
        const total=dayCbs.length+dayCalls_.length+dayDeals.length;

        return (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="glass rounded-xl border border-border p-3">
                <div className="text-[10px] text-txt3 uppercase tracking-wider font-semibold">Callbacky</div>
                <div className="text-lg font-bold text-accent mt-1">{dayCbs.length}</div>
                <div className="text-[10px] text-txt3">{dayCbs.filter(c=>!c.completed).length} čekajících</div>
              </div>
              <div className="glass rounded-xl border border-border p-3">
                <div className="text-[10px] text-txt3 uppercase tracking-wider font-semibold">Hovory</div>
                <div className="text-lg font-bold text-green mt-1">{dayCalls_.length}</div>
              </div>
              <div className="glass rounded-xl border border-border p-3">
                <div className="text-[10px] text-txt3 uppercase tracking-wider font-semibold">Dealy</div>
                <div className="text-lg font-bold text-cyan-400 mt-1">{dayDeals.length}</div>
                <div className="text-[10px] text-txt3">{dayDeals.reduce((s,d)=>s+(d.amount||0),0).toLocaleString("cs-CZ")} Kč</div>
              </div>
              <div className="glass rounded-xl border border-border p-3">
                <div className="text-[10px] text-txt3 uppercase tracking-wider font-semibold">Poznámky</div>
                <div className="text-lg font-bold text-purple mt-1">{dayNotes.length}</div>
              </div>
              <div className="glass rounded-xl border border-border p-3">
                <div className="text-[10px] text-txt3 uppercase tracking-wider font-semibold">Celkem</div>
                <div className="text-lg font-bold mt-1">{total}</div>
              </div>
            </div>

            {/* Notes section */}
            {(dayNotes.length > 0 || true) && (
              <div className="glass rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote size={12} className="text-purple"/>
                    <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">Poznámky</span>
                  </div>
                  <button onClick={()=>{setNoteDate(noteDate===ds?null:ds);setNoteText("");}}
                    className="flex items-center gap-1 text-[10px] text-purple hover:text-purple/80 font-semibold transition-colors">
                    <Plus size={10}/> Přidat
                  </button>
                </div>
                {noteDate === ds && (
                  <div className="flex items-center gap-2 mb-2">
                    <input type="text" value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Napište poznámku..."
                      onKeyDown={e=>{if(e.key==="Enter")saveNote();if(e.key==="Escape")setNoteDate(null);}}
                      className="flex-1 px-3 py-2 rounded-xl bg-surface2/50 border border-border text-sm placeholder:text-txt3/50 focus:outline-none focus:border-purple/50 transition-colors" autoFocus/>
                    <button onClick={saveNote} disabled={noteSaving||!noteText.trim()}
                      className="px-3 py-2 rounded-xl bg-purple/10 text-purple text-xs font-semibold hover:bg-purple/20 disabled:opacity-40 transition-colors">
                      {noteSaving?"...":"Uložit"}
                    </button>
                  </div>
                )}
                {dayNotes.length > 0 ? (
                  <div className="space-y-1">
                    {dayNotes.map(n => (
                      <div key={n.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-purple/5 text-sm">
                        <span className="flex-1">{n.text}</span>
                        {isAdmin && n.userName && <span className="text-[10px] text-txt3">{n.userName}</span>}
                        <button onClick={()=>deleteNote(n.id)} className="p-1 rounded hover:bg-red/10 text-txt3 hover:text-red opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={11}/></button>
                      </div>
                    ))}
                  </div>
                ) : !noteDate && <p className="text-[10px] text-txt3">Žádné poznámky</p>}
              </div>
            )}

            {/* Day hourly grid */}
            <div className="glass rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${isT?"bg-accent text-white":"bg-surface2"}`}>
                    <span className="text-[10px] font-semibold leading-none">{DAY_NAMES_SHORT[getMondayIndex(currentDate)]}</span>
                    <span className="text-sm font-bold leading-none mt-0.5">{currentDate.getDate()}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{headerLabel}</div>
                    <div className="text-[10px] text-txt3">{total} událostí</div>
                  </div>
                </div>
                <button onClick={()=>openCreate(ds)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors">
                  <Plus size={12}/> Callback
                </button>
              </div>

              <div className="relative">
                {HOURS.map(hour => {
                  const hs=String(hour).padStart(2,"0"), tk=`${ds}|${hour}`, isDrop=dropTarget===tk;
                  const hCbs=dayCbs.filter(cb=>cb.time&&cb.time.startsWith(hs+":"));
                  const hCls=dayCalls_.filter(c=>c.time&&c.time.startsWith(hs+":"));
                  const has=hCbs.length>0||hCls.length>0;
                  return (
                    <div key={hour} className={`grid grid-cols-[80px_1fr] border-b border-border/30 transition-colors ${isDrop?"bg-accent/10 ring-2 ring-accent/30 ring-inset":""}`}
                      onDragOver={e=>handleDragOver(e,tk)} onDragLeave={handleDragLeave} onDrop={e=>handleDrop(e,ds,hour)}>
                      <div className="text-xs text-txt3 text-right pr-3 py-4 border-r border-border/50 font-medium">{hs}:00</div>
                      <div className={`min-h-[80px] p-2 cursor-pointer hover:bg-surface2/30 transition-colors`} onDoubleClick={()=>openCreate(ds,hour)}>
                        <div className="space-y-1.5">
                          {hCbs.map(cb => (
                            <div key={cb.id} draggable={!cb.completed} onDragStart={e=>handleDragStart(e,cb)} onDragEnd={handleDragEnd}
                              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${cb.completed?"bg-green/5":"bg-accent/5 hover:bg-accent/10"} ${draggedCb?.id===cb.id?"opacity-30 scale-95":"cursor-grab active:cursor-grabbing"}`}>
                              {!cb.completed && <GripVertical size={12} className="text-txt3/40 group-hover:text-txt3 shrink-0"/>}
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center shrink-0"><PhoneForwarded size={12} className="text-accent"/></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{cn(cb.contactFirstName,cb.contactLastName)}</span>
                                  {cb.completed ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green/10 text-green">Dokončeno</span>
                                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent">Čekající</span>}
                                  {isAdmin && cb.agentName && <span className="text-[10px] text-txt3">{cb.agentName}</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                                  <span className="flex items-center gap-1"><Clock size={10}/> {cb.time}</span>
                                  {cb.note && <span className="truncate">{cb.note}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {!cb.completed && <button onClick={e=>{e.stopPropagation();markComplete(cb.id);}} className="p-1.5 rounded-lg hover:bg-green/10 text-txt3 hover:text-green transition-colors"><CheckCircle size={14}/></button>}
                                <button onClick={e=>{e.stopPropagation();deleteCallback(cb.id);}} className="p-1.5 rounded-lg hover:bg-red/10 text-txt3 hover:text-red transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={13}/></button>
                              </div>
                            </div>
                          ))}
                          {hCls.map(cl => (
                            <div key={cl.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-green/5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green/20 to-green/10 flex items-center justify-center shrink-0"><Phone size={12} className="text-green"/></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{cn(cl.contactFirstName,cl.contactLastName)}</span>
                                  {isAdmin && cl.agentName && <span className="text-[10px] text-txt3">{cl.agentName}</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                                  <span className="flex items-center gap-1"><Clock size={10}/> {cl.time}</span>
                                  {cl.result && <span className="font-medium">{cl.result}</span>}
                                  <span>{fmtDur(cl.duration)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {!has && <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-txt3/50 flex items-center gap-1"><Plus size={10}/> Dvojklik pro callback</span>
                        </div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {dayDeals.length>0 && (
                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"/>
                    <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">Dealy ({dayDeals.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dayDeals.map(dl => (
                      <div key={dl.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-cyan-400/5">
                        <Handshake size={12} className="text-cyan-400 shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{cn(dl.contactFirstName,dl.contactLastName)}</span>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                            {dl.product && <span>{dl.product}</span>}
                            {dl.amount>0 && <span className="font-medium text-cyan-400">{dl.amount.toLocaleString("cs-CZ")} Kč</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ─── Day detail (month/week) ─── */}
      {(view==="month"||view==="week") && selectedDay && (
        <div className="hidden md:block">{renderDayDetail(selectedDay)}</div>
      )}

      {/* ─── Create Modal ─── */}
      {createModal && (
        <CreateCallbackModal prefillDate={createModal.date} prefillTime={createModal.time}
          onClose={()=>setCreateModal(null)} onCreated={loadData}/>
      )}
    </div>
  );
}
