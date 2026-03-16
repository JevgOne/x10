"use client";

import { useEffect, useState, useCallback } from "react";
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
  Calendar,
} from "lucide-react";

/* ─── Types ─── */

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

interface Call {
  id: string;
  contactId: string;
  agentId: string;
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

interface Deal {
  id: string;
  contactId: string;
  agentId: string;
  contactFirstName?: string;
  contactLastName?: string;
  agentName?: string;
  projectName?: string;
  product: string;
  amount: number;
  signDate: string;
  note: string;
  createdAt: string;
}

/* ─── Czech locale helpers ─── */

const DAY_NAMES_SHORT = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const DAY_NAMES_LONG = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getToday(): string {
  return toDateStr(new Date());
}

/** Monday-based: 0=Mon .. 6=Sun */
function getMondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Get all dates for the calendar grid (includes padding from prev/next months) */
function getCalendarDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startPad = getMondayIndex(firstOfMonth); // how many days from prev month
  const totalDays = startPad + lastOfMonth.getDate();
  const rows = Math.ceil(totalDays / 7);
  const totalCells = rows * 7;

  const days: Date[] = [];
  const startDate = new Date(year, month, 1 - startPad);
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Get Monday of the week containing this date */
function getWeekStart(d: Date): Date {
  const copy = new Date(d);
  const idx = getMondayIndex(copy);
  copy.setDate(copy.getDate() - idx);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function contactName(first?: string, last?: string): string {
  return (first || last) ? `${first || ""} ${last || ""}`.trim() : "—";
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ─── Component ─── */

type ViewMode = "month" | "week";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8..19

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = getToday();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  /* ─── Data fetching ─── */
  const loadData = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const [cbRes, clRes, dlRes] = await Promise.all([
        fetch("/api/callbacks"),
        fetch("/api/calls"),
        fetch("/api/deals"),
      ]);
      if (!cbRes.ok) throw new Error("Chyba při načítání callbacků");
      if (!clRes.ok) throw new Error("Chyba při načítání hovorů");
      if (!dlRes.ok) throw new Error("Chyba při načítání dealů");
      const cbData = await cbRes.json();
      const clData = await clRes.json();
      const dlData = await dlRes.json();
      setCallbacks(cbData.callbacks || []);
      setCalls(clData.calls || []);
      setDeals(dlData.deals || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Neznámá chyba");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Quick-action: mark callback complete ─── */
  const markComplete = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/callbacks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Chyba při označování jako dokončeno");
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Neznámá chyba");
    }
  };

  /* ─── Helpers to get events by date ─── */
  const callbacksByDate = (dateStr: string) => callbacks.filter((cb) => cb.date === dateStr);
  const callsByDate = (dateStr: string) => calls.filter((c) => c.date === dateStr);
  const dealsByDate = (dateStr: string) => deals.filter((d) => d.signDate === dateStr);

  /* ─── Navigation ─── */
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const goPrev = () => {
    if (view === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const ws = getWeekStart(currentDate);
      ws.setDate(ws.getDate() - 7);
      setCurrentDate(ws);
    }
    setSelectedDay(null);
  };

  const goNext = () => {
    if (view === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const ws = getWeekStart(currentDate);
      ws.setDate(ws.getDate() + 7);
      setCurrentDate(ws);
    }
    setSelectedDay(null);
  };

  /* ─── Build label ─── */
  const headerLabel =
    view === "month"
      ? `${MONTH_NAMES[month]} ${year}`
      : (() => {
          const ws = getWeekStart(currentDate);
          const we = new Date(ws);
          we.setDate(we.getDate() + 6);
          const fmt = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
          return `${fmt(ws)} – ${fmt(we)} ${we.getFullYear()}`;
        })();

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ─── Monthly calendar grid data ─── */
  const calendarDays = getCalendarDays(year, month);

  /* ─── Weekly data ─── */
  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  /* ─── Day detail section ─── */
  const renderDayDetail = (dateStr: string) => {
    const dayCbs = callbacksByDate(dateStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const dayCalls = callsByDate(dateStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const dayDeals = dealsByDate(dateStr);

    const dateObj = new Date(dateStr + "T00:00:00");
    const dayIdx = getMondayIndex(dateObj);
    const label = `${DAY_NAMES_LONG[dayIdx]} ${dateObj.getDate()}. ${MONTH_NAMES[dateObj.getMonth()]}`;

    const isEmpty = dayCbs.length === 0 && dayCalls.length === 0 && dayDeals.length === 0;

    return (
      <div className="glass rounded-2xl border border-border p-4 md:p-5 space-y-4 animate-in">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">{label}</h3>
          <button
            onClick={() => setSelectedDay(null)}
            className="p-1.5 rounded-lg hover:bg-surface2 text-txt3 hover:text-txt transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isEmpty && (
          <p className="text-txt3 text-sm py-4 text-center">Žádné události pro tento den</p>
        )}

        {/* Callbacks */}
        {dayCbs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">
                Callbacky ({dayCbs.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {dayCbs.map((cb) => (
                <div
                  key={cb.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    cb.completed ? "bg-green/5" : "bg-accent/5 hover:bg-accent/10"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center shrink-0">
                    <PhoneForwarded size={11} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {contactName(cb.contactFirstName, cb.contactLastName)}
                      </span>
                      {cb.completed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green/10 text-green shrink-0">
                          Dokončeno
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent shrink-0">
                          Čekající
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                      {cb.time && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {cb.time}
                        </span>
                      )}
                      {cb.note && <span className="truncate">{cb.note}</span>}
                    </div>
                  </div>
                  {!cb.completed && (
                    <button
                      onClick={() => markComplete(cb.id)}
                      title="Označit jako dokončeno"
                      className="p-1.5 rounded-lg hover:bg-green/10 text-txt3 hover:text-green transition-colors shrink-0"
                    >
                      <CheckCircle size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calls */}
        {dayCalls.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green" />
              <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">
                Hovory ({dayCalls.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {dayCalls.map((cl) => (
                <div
                  key={cl.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-green/5"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green/20 to-green/10 flex items-center justify-center shrink-0">
                    <Phone size={11} className="text-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">
                      {contactName(cl.contactFirstName, cl.contactLastName)}
                    </span>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                      {cl.time && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {cl.time}
                        </span>
                      )}
                      {cl.result && <span>{cl.result}</span>}
                      <span>{formatDuration(cl.duration)}</span>
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
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">
                Dealy ({dayDeals.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {dayDeals.map((dl) => (
                <div
                  key={dl.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-cyan-400/5"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400/20 to-cyan-400/10 flex items-center justify-center shrink-0">
                    <Handshake size={11} className="text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">
                      {contactName(dl.contactFirstName, dl.contactLastName)}
                    </span>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-txt3">
                      {dl.product && <span>{dl.product}</span>}
                      {dl.amount > 0 && (
                        <span className="font-medium text-cyan-400">
                          {dl.amount.toLocaleString("cs-CZ")} Kč
                        </span>
                      )}
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

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Kalendář</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-0.5 bg-surface2/50 rounded-xl p-0.5">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === "month"
                  ? "bg-accent text-white shadow-lg"
                  : "text-txt3 hover:text-txt2"
              }`}
            >
              Měsíc
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === "week"
                  ? "bg-accent text-white shadow-lg"
                  : "text-txt3 hover:text-txt2"
              }`}
            >
              Týden
            </button>
          </div>
          {/* Today button */}
          <button
            onClick={goToday}
            className="btn-ghost text-xs px-3 py-1.5"
          >
            Dnes
          </button>
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="glass rounded-xl border border-red/30 p-4 flex items-center gap-3 text-red text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red/60 hover:text-red">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Navigation ─── */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          className="p-2 rounded-xl hover:bg-surface2 text-txt3 hover:text-txt transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold">{headerLabel}</span>
        <button
          onClick={goNext}
          className="p-2 rounded-xl hover:bg-surface2 text-txt3 hover:text-txt transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ─── Legend ─── */}
      <div className="flex items-center gap-4 text-[11px] text-txt3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" /> Callbacky
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green" /> Hovory
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Dealy
        </span>
      </div>

      {/* ─── MONTH VIEW ─── */}
      {view === "month" && (
        <>
          {/* Desktop grid */}
          <div className="glass rounded-2xl border border-border overflow-hidden hidden md:block">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAY_NAMES_SHORT.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-semibold text-txt3 uppercase tracking-wider py-2.5"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const ds = toDateStr(day);
                const isCurrentMonth = day.getMonth() === month;
                const isToday = ds === today;
                const isSelected = ds === selectedDay;
                const dayCbs = callbacksByDate(ds);
                const dayCalls = callsByDate(ds);
                const dayDeals = dealsByDate(ds);
                const hasEvents = dayCbs.length > 0 || dayCalls.length > 0 || dayDeals.length > 0;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : ds)}
                    className={`min-h-[100px] border-b border-r border-border/50 p-1.5 cursor-pointer transition-colors ${
                      isCurrentMonth ? "" : "opacity-30"
                    } ${isSelected ? "bg-accent/5" : "hover:bg-surface2/50"}`}
                  >
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`w-7 h-7 flex items-center justify-center text-xs font-semibold rounded-full ${
                          isToday
                            ? "bg-accent text-white"
                            : "text-txt2"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {hasEvents && (
                        <div className="flex gap-0.5">
                          {dayCbs.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                          {dayCalls.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green" />}
                          {dayDeals.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        </div>
                      )}
                    </div>

                    {/* Event pills */}
                    <div className="space-y-0.5">
                      {dayCbs.slice(0, 2).map((cb) => (
                        <div
                          key={cb.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                            cb.completed
                              ? "bg-green/10 text-green"
                              : "bg-accent/10 text-accent"
                          }`}
                        >
                          {cb.time && <span className="font-medium">{cb.time} </span>}
                          {contactName(cb.contactFirstName, cb.contactLastName)}
                        </div>
                      ))}
                      {dayCbs.length > 2 && (
                        <div className="text-[10px] text-accent/60 px-1.5">
                          +{dayCbs.length - 2} dalších
                        </div>
                      )}
                      {dayCalls.length > 0 && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded bg-green/10 text-green truncate">
                          {dayCalls.length} {dayCalls.length === 1 ? "hovor" : dayCalls.length < 5 ? "hovory" : "hovorů"}
                        </div>
                      )}
                      {dayDeals.length > 0 && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 truncate">
                          {dayDeals.length} {dayDeals.length === 1 ? "deal" : dayDeals.length < 5 ? "dealy" : "dealů"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile list view */}
          <div className="md:hidden space-y-2">
            {calendarDays
              .filter((d) => d.getMonth() === month)
              .map((day, i) => {
                const ds = toDateStr(day);
                const isToday = ds === today;
                const dayCbs = callbacksByDate(ds);
                const dayCalls = callsByDate(ds);
                const dayDeals = dealsByDate(ds);
                const hasEvents = dayCbs.length > 0 || dayCalls.length > 0 || dayDeals.length > 0;
                const isSelected = ds === selectedDay;
                const dayIdx = getMondayIndex(day);

                if (!hasEvents && !isToday) return null;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : ds)}
                    className={`glass rounded-xl border border-border p-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-accent/5 border-accent/20" : "hover:bg-surface2/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          isToday ? "bg-accent text-white" : "bg-surface2"
                        }`}
                      >
                        <span className="text-[10px] font-semibold leading-none">
                          {DAY_NAMES_SHORT[dayIdx]}
                        </span>
                        <span className="text-sm font-bold leading-none mt-0.5">
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {dayCbs.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent">
                              {dayCbs.length} cb
                            </span>
                          )}
                          {dayCalls.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green/10 text-green">
                              {dayCalls.length} hovorů
                            </span>
                          )}
                          {dayDeals.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-400/10 text-cyan-400">
                              {dayDeals.length} dealů
                            </span>
                          )}
                        </div>
                        {dayCbs.length > 0 && (
                          <div className="text-xs text-txt3 mt-1 truncate">
                            {dayCbs[0].time && `${dayCbs[0].time} `}
                            {contactName(dayCbs[0].contactFirstName, dayCbs[0].contactLastName)}
                            {dayCbs.length > 1 && ` +${dayCbs.length - 1}`}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <div className="mt-3">{renderDayDetail(ds)}</div>}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* ─── WEEK VIEW ─── */}
      {view === "week" && (
        <>
          {/* Desktop week grid */}
          <div className="glass rounded-2xl border border-border overflow-hidden hidden md:block">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
              <div className="border-r border-border/50" />
              {weekDays.map((day, i) => {
                const ds = toDateStr(day);
                const isToday = ds === today;
                return (
                  <div
                    key={i}
                    className={`text-center py-3 border-r border-border/50 last:border-r-0 ${
                      isToday ? "bg-accent/5" : ""
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-txt3 uppercase tracking-wider">
                      {DAY_NAMES_SHORT[i]}
                    </div>
                    <div
                      className={`text-sm font-bold mt-0.5 ${
                        isToday ? "w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center mx-auto" : "text-txt2"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time slots */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30">
                  <div className="text-[10px] text-txt3 text-right pr-2 py-3 border-r border-border/50">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {weekDays.map((day, di) => {
                    const ds = toDateStr(day);
                    const isToday = ds === today;
                    const hourStr = String(hour).padStart(2, "0");

                    // Get callbacks in this hour
                    const hourCbs = callbacksByDate(ds).filter(
                      (cb) => cb.time && cb.time.startsWith(hourStr + ":")
                    );
                    // Get calls in this hour
                    const hourCalls = callsByDate(ds).filter(
                      (c) => c.time && c.time.startsWith(hourStr + ":")
                    );

                    return (
                      <div
                        key={di}
                        onClick={() => setSelectedDay(ds)}
                        className={`min-h-[48px] border-r border-border/30 last:border-r-0 p-0.5 cursor-pointer transition-colors ${
                          isToday ? "bg-accent/[0.02]" : ""
                        } hover:bg-surface2/30`}
                      >
                        {hourCbs.map((cb) => (
                          <div
                            key={cb.id}
                            className={`text-[10px] px-1.5 py-1 rounded mb-0.5 truncate ${
                              cb.completed
                                ? "bg-green/10 text-green"
                                : "bg-accent/10 text-accent"
                            }`}
                          >
                            <span className="font-semibold">{cb.time}</span>{" "}
                            {contactName(cb.contactFirstName, cb.contactLastName)}
                          </div>
                        ))}
                        {hourCalls.map((cl) => (
                          <div
                            key={cl.id}
                            className="text-[10px] px-1.5 py-1 rounded mb-0.5 truncate bg-green/10 text-green"
                          >
                            <span className="font-semibold">{cl.time}</span>{" "}
                            {contactName(cl.contactFirstName, cl.contactLastName)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Deals row at bottom */}
            {weekDays.some((d) => dealsByDate(toDateStr(d)).length > 0) && (
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-t border-border">
                <div className="text-[10px] text-txt3 text-right pr-2 py-3 border-r border-border/50">
                  Dealy
                </div>
                {weekDays.map((day, di) => {
                  const ds = toDateStr(day);
                  const dayDeals = dealsByDate(ds);
                  return (
                    <div key={di} className="border-r border-border/30 last:border-r-0 p-0.5">
                      {dayDeals.map((dl) => (
                        <div
                          key={dl.id}
                          className="text-[10px] px-1.5 py-1 rounded mb-0.5 truncate bg-cyan-400/10 text-cyan-400"
                        >
                          {contactName(dl.contactFirstName, dl.contactLastName)}
                          {dl.amount > 0 && (
                            <span className="font-semibold ml-1">
                              {dl.amount.toLocaleString("cs-CZ")} Kč
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile week list */}
          <div className="md:hidden space-y-2">
            {weekDays.map((day, i) => {
              const ds = toDateStr(day);
              const isToday = ds === today;
              const dayCbs = callbacksByDate(ds);
              const dayCalls = callsByDate(ds);
              const dayDeals = dealsByDate(ds);
              const hasEvents = dayCbs.length > 0 || dayCalls.length > 0 || dayDeals.length > 0;
              const isSelected = ds === selectedDay;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : ds)}
                  className={`glass rounded-xl border border-border p-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-accent/5 border-accent/20" : "hover:bg-surface2/50"
                  } ${!hasEvents && !isToday ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                        isToday ? "bg-accent text-white" : "bg-surface2"
                      }`}
                    >
                      <span className="text-[10px] font-semibold leading-none">
                        {DAY_NAMES_SHORT[i]}
                      </span>
                      <span className="text-sm font-bold leading-none mt-0.5">
                        {day.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {hasEvents ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {dayCbs.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-accent/10 text-accent">
                              {dayCbs.length} cb
                            </span>
                          )}
                          {dayCalls.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green/10 text-green">
                              {dayCalls.length} hovorů
                            </span>
                          )}
                          {dayDeals.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-400/10 text-cyan-400">
                              {dayDeals.length} dealů
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-txt3">Žádné události</span>
                      )}
                    </div>
                  </div>
                  {isSelected && hasEvents && <div className="mt-3">{renderDayDetail(ds)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Day detail panel (desktop, month view) ─── */}
      {view === "month" && selectedDay && (
        <div className="hidden md:block">{renderDayDetail(selectedDay)}</div>
      )}

      {/* ─── Day detail panel (desktop, week view) ─── */}
      {view === "week" && selectedDay && (
        <div className="hidden md:block">{renderDayDetail(selectedDay)}</div>
      )}
    </div>
  );
}
