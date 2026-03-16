"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Phone, Mail, MapPin, Flame, Snowflake, ChevronDown, ChevronRight,
  Clock, Pause, Play, SkipForward, PhoneOff, PhoneCall,
  Calendar, FileText, User, TrendingUp, AlertCircle, X,
} from "lucide-react";

/* ─── Types ─── */
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

interface Callback {
  id: string;
  contactId: string;
  date: string;
  time: string;
  note: string;
  completed: boolean;
}

/* ─── Constants ─── */
type AgentStatus = "ready" | "calling" | "wrapup" | "paused";

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; icon: typeof Phone }> = {
  ready: { label: "Pripraveno", color: "bg-green/20 text-green border-green/30", icon: Play },
  calling: { label: "Volam", color: "bg-accent/20 text-accent border-accent/30", icon: PhoneCall },
  wrapup: { label: "Wrap-up", color: "bg-yellow/20 text-yellow border-yellow/30", icon: Clock },
  paused: { label: "Pauza", color: "bg-red/20 text-red border-red/30", icon: Pause },
};

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

const CALL_RESULTS = [
  { key: "answered", label: "Zvedl", color: "bg-green/15 text-green border-green/30 hover:bg-green/25" },
  { key: "not_answered", label: "Nezvedl", color: "bg-red/15 text-red border-red/30 hover:bg-red/25" },
  { key: "busy", label: "Obsazeno", color: "bg-yellow/15 text-yellow border-yellow/30 hover:bg-yellow/25" },
  { key: "voicemail", label: "Hlasovka", color: "bg-purple/15 text-purple border-purple/30 hover:bg-purple/25" },
  { key: "callback", label: "Callback", color: "bg-accent/15 text-accent border-accent/30 hover:bg-accent/25" },
  { key: "interested", label: "Zajem", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25" },
  { key: "not_interested", label: "Bez zajmu", color: "bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25" },
  { key: "deal", label: "Obchod", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25" },
];

function formatCZK(amount: number) {
  if (!amount) return "";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

/* ─── Script sections ─── */
const SCRIPT_SECTIONS = [
  {
    title: "Uvodni pozdrav",
    content: `Dobry den, tady [Vase jmeno] ze spolecnosti ECG Build. Volam Vam, protoze jsme identifikovali zajimavy investicni prilezitost v oblasti stavebnictvi a facility managementu, ktera by mohla byt pro Vas relevantni.

Mate ted chvilku cas? Zabere to maximalne 5 minut.`,
  },
  {
    title: "Kvalifikacni otazky",
    content: `1. "Zajimate se o investovani obecne, nebo uz mate nejake zkusenosti s investicemi?"

2. "Jake je Vase priblizne investicni rozpocti? Nase minimalni vstupni investice je od 500 000 Kc."

3. "Jaky je Vas preferovany investicni horizont? My nabizime produkty s horizontem 3-7 let."

4. "Jake je Vase ocekavani ohledne vynosu? Nase historicke vynosy se pohybuji mezi 8-12 % p.a."`,
  },
  {
    title: "Predstaveni produktu",
    content: `ECG Build je investicni fond zamereny na stavebnictvi a facility management v CR:

- Stabilni vynosy 8-12 % rocne, podlozene realnym stavebnimi projekty
- Diverzifikace pres vice stavebnih projektu soucasne
- Profesionalni sprava fondu s 15+ lety zkusenosti v oboru
- Pravidelny reporting a transparentni komunikace
- Moznost reinvestice nebo pravidelneho vyplaty vynosu
- Regulovano CNB, plna compliance s ceskou legislativou
- Minimalni investice od 500 000 Kc, bez vstupniho poplatku`,
  },
  {
    title: "Casne namitky a odpovedi",
    content: `"Nemam na to penize":
-> "Rozumim. Nas minimalni vstup je 500 000 Kc. Existuje moznost sporkoveho planu, ktery umoznuje postupne budovat investici."

"Neverim investicnim fondum":
-> "Chapu Vasi opatrnost. ECG Build je regulovan Ceskou narodni bankou. Nase investice jsou kryty realnym stavebnimi projekty, coz poskytuje vetsi bezpecnost nez ciste financni nastroje."

"Musim se poradit s manzelkou/manzelem":
-> "Samozrejme, to je zcela v poradku. Mohu Vam poslat informacni materialy e-mailem a domluvime se na dalsim hovoru, napr. za tyden?"

"Ted se mi to nehodi":
-> "Rozumim. Kdy by se Vam hodilo, abych zavolal znovu? Rad Vam vse vysvetlim, az na to budete mit cas."

"Mam jine investice":
-> "To je skvele, ze investujete. ECG Build muze byt skvela doplnkova investice pro diverzifikaci Vaseho portfolia. Stavebni sektor ma nizkou korelaci s akciovymi trhy."`,
  },
  {
    title: "Zaverecny skript",
    content: `Pri zajmu:
"Skvele! Dalsi krok bude osobni schuze / online prezentace, kde Vam detailne predstavime konkretni investicni moznosti. Hodil by se Vam termin [nabidnout 2 moznosti]?"

Pri nerozhodnosti:
"Rozumim, ze je to dulezite rozhodnuti. Co kdybych Vam poslal informacni brozuru e-mailem a zavolal Vam znovu za [3-5 dni]?"

Rozlouceni:
"Dekuji za Vas cas, [Jmeno klienta]. Preji Vam pekny den/vecer. Na shledanou."`,
  },
];

/* ─── Component ─── */
export default function CallModePage() {
  // Auth
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  // Queue
  const [queue, setQueue] = useState<Contact[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Pending callbacks (overdue)
  const [pendingCallbacks, setPendingCallbacks] = useState<Callback[]>([]);
  // Agent state
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("ready");
  const [callNote, setCallNote] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [wrapupRemaining, setWrapupRemaining] = useState(0);
  const wrapupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Callback modal
  const [showCallbackPicker, setShowCallbackPicker] = useState(false);
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [callbackNote, setCallbackNote] = useState("");
  // Script collapse
  const [openScripts, setOpenScripts] = useState<Set<number>>(new Set([0]));
  // Stats
  const [todayCalls, setTodayCalls] = useState(0);
  const [todayInterested, setTodayInterested] = useState(0);
  const [todayDeals, setTodayDeals] = useState(0);
  // Saving
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";
  const current = queue[queueIndex] || null;
  const remaining = queue.length - queueIndex;

  /* ─── Auth ─── */
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {});
  }, []);

  /* ─── Load queue ─── */
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch contacts (agents see only theirs, admin sees all)
      const params = new URLSearchParams({ limit: "500" });
      const [cRes, cbRes] = await Promise.all([
        fetch(`/api/contacts?${params}`),
        fetch("/api/callbacks?completed=false"),
      ]);
      if (!cRes.ok) throw new Error("Chyba nacitani kontaktu");

      const cData = await cRes.json();
      const cbData = cbRes.ok ? await cbRes.json() : { callbacks: [] };

      const contacts: Contact[] = cData.contacts || [];
      const callbacks: Callback[] = cbData.callbacks || [];

      // Build set of contact IDs that have overdue/pending callbacks
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const overdueCallbackContactIds = new Set<string>();
      const pendingCbs: Callback[] = [];

      callbacks.forEach((cb: Callback) => {
        if (!cb.completed && cb.date && cb.date <= todayStr) {
          overdueCallbackContactIds.add(cb.contactId);
          pendingCbs.push(cb);
        }
      });
      setPendingCallbacks(pendingCbs);

      // Filter out closed/lost contacts
      const eligible = contacts.filter(
        (c) => c.pipelineStage !== "uzavreno" && c.pipelineStage !== "ztraceno"
      );

      // Sort: overdue callbacks first, then hot > warm > cold, then oldest lastContactDate
      const hotColdOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2 };

      eligible.sort((a, b) => {
        const aHasCb = overdueCallbackContactIds.has(a.id) ? 0 : 1;
        const bHasCb = overdueCallbackContactIds.has(b.id) ? 0 : 1;
        if (aHasCb !== bHasCb) return aHasCb - bHasCb;

        const aHot = hotColdOrder[a.hotCold] ?? 1;
        const bHot = hotColdOrder[b.hotCold] ?? 1;
        if (aHot !== bHot) return aHot - bHot;

        const aDate = a.lastContactDate || "0000-00-00";
        const bDate = b.lastContactDate || "0000-00-00";
        return aDate.localeCompare(bDate);
      });

      setQueue(eligible);
      setQueueIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba nacitani");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  /* ─── Load today stats ─── */
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/calls?limit=500");
      if (!res.ok) return;
      const data = await res.json();
      const today = new Date().toISOString().split("T")[0];
      const todaysCallsList = (data.calls || []).filter(
        (c: { date: string }) => c.date === today
      );
      setTodayCalls(todaysCallsList.length);
      setTodayInterested(
        todaysCallsList.filter((c: { result: string }) => c.result === "interested").length
      );
      setTodayDeals(
        todaysCallsList.filter((c: { result: string }) => c.result === "deal").length
      );
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* ─── Wrap-up timer ─── */
  const startWrapup = useCallback(() => {
    setAgentStatus("wrapup");
    setWrapupRemaining(30);
    if (wrapupTimerRef.current) clearInterval(wrapupTimerRef.current);
    wrapupTimerRef.current = setInterval(() => {
      setWrapupRemaining((prev) => {
        if (prev <= 1) {
          if (wrapupTimerRef.current) clearInterval(wrapupTimerRef.current);
          wrapupTimerRef.current = null;
          // Auto-advance to next contact
          setAgentStatus("ready");
          setQueueIndex((idx) => idx + 1);
          setCallNote("");
          setCallDuration(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (wrapupTimerRef.current) clearInterval(wrapupTimerRef.current);
    };
  }, []);

  /* ─── Skip wrap-up and go next ─── */
  const skipToNext = () => {
    if (wrapupTimerRef.current) {
      clearInterval(wrapupTimerRef.current);
      wrapupTimerRef.current = null;
    }
    setWrapupRemaining(0);
    setAgentStatus("ready");
    setQueueIndex((idx) => idx + 1);
    setCallNote("");
    setCallDuration(0);
  };

  /* ─── Save call result ─── */
  const saveCallResult = async (resultKey: string) => {
    if (!current || saving) return;

    // If callback, show the picker first
    if (resultKey === "callback") {
      setShowCallbackPicker(true);
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      // Save the call
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: current.id,
          date: now.toISOString().split("T")[0],
          time: now.toTimeString().slice(0, 5),
          duration: callDuration,
          type: "outbound",
          result: resultKey,
          note: callNote,
        }),
      });
      if (!res.ok) throw new Error("Chyba ukladani hovoru");

      // If interested → change stage to "zajem"
      if (resultKey === "interested" && current.pipelineStage !== "zajem" && current.pipelineStage !== "nabidka" && current.pipelineStage !== "jednani" && current.pipelineStage !== "smlouva") {
        await fetch(`/api/contacts/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineStage: "zajem" }),
        });
      }

      // If deal → change stage to "smlouva"
      if (resultKey === "deal") {
        await fetch(`/api/contacts/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineStage: "smlouva" }),
        });
      }

      // If answered (but not special result) → mark as contacted
      if (resultKey === "answered" && current.pipelineStage === "novy") {
        await fetch(`/api/contacts/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineStage: "kontaktovany" }),
        });
      }

      // Update stats
      setTodayCalls((p) => p + 1);
      if (resultKey === "interested") setTodayInterested((p) => p + 1);
      if (resultKey === "deal") setTodayDeals((p) => p + 1);

      // Start wrap-up
      startWrapup();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba ukladani hovoru");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Save callback ─── */
  const saveCallback = async () => {
    if (!current || saving || !callbackDate) return;
    setSaving(true);
    try {
      const now = new Date();

      // Save the call first
      const callRes = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: current.id,
          date: now.toISOString().split("T")[0],
          time: now.toTimeString().slice(0, 5),
          duration: callDuration,
          type: "outbound",
          result: "callback",
          note: callNote,
        }),
      });
      if (!callRes.ok) throw new Error("Chyba ukladani hovoru");

      // Save the callback
      const cbRes = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: current.id,
          date: callbackDate,
          time: callbackTime || "09:00",
          note: callbackNote || callNote,
        }),
      });
      if (!cbRes.ok) throw new Error("Chyba ukladani callbacku");

      setTodayCalls((p) => p + 1);
      setShowCallbackPicker(false);
      setCallbackDate("");
      setCallbackTime("");
      setCallbackNote("");

      startWrapup();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba ukladani");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Toggle script section ─── */
  const toggleScript = (idx: number) => {
    setOpenScripts((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  /* ─── Toggle pause ─── */
  const togglePause = () => {
    if (agentStatus === "paused") {
      setAgentStatus("ready");
    } else if (agentStatus === "ready") {
      setAgentStatus("paused");
    }
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ─── Check if there is a pending callback for current contact ─── */
  const currentCallback = current
    ? pendingCallbacks.find((cb) => cb.contactId === current.id)
    : null;

  return (
    <div className="space-y-4">
      {/* Error bar */}
      {error && (
        <div className="text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20 flex justify-between items-center">
          {error}
          <button onClick={() => setError("")} className="text-red hover:text-red/70"><X size={14} /></button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass rounded-xl border border-border p-3">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Stav</div>
          <div className={`inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-lg border ${STATUS_CONFIG[agentStatus].color}`}>
            {(() => { const Icon = STATUS_CONFIG[agentStatus].icon; return <Icon size={14} />; })()}
            {STATUS_CONFIG[agentStatus].label}
            {agentStatus === "wrapup" && <span className="font-mono ml-1">({wrapupRemaining}s)</span>}
          </div>
        </div>
        <div className="glass rounded-xl border border-border p-3">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Hovory dnes</div>
          <div className="text-xl font-bold">{todayCalls}</div>
        </div>
        <div className="glass rounded-xl border border-border p-3">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Zajem dnes</div>
          <div className="text-xl font-bold text-emerald-400">{todayInterested}</div>
        </div>
        <div className="glass rounded-xl border border-border p-3">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Obchody dnes</div>
          <div className="text-xl font-bold text-cyan-400">{todayDeals}</div>
        </div>
        <div className="glass rounded-xl border border-border p-3 col-span-2 md:col-span-1">
          <div className="text-[10px] text-txt3 uppercase tracking-wider mb-1">Ve fronte</div>
          <div className="text-xl font-bold text-accent">{remaining}</div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* ─── LEFT: Contact + Script (2/3) ─── */}
        <div className="flex-1 lg:flex-[2] min-w-0 space-y-4">
          {/* Contact card */}
          {!current ? (
            <div className="glass rounded-2xl border border-border p-8 text-center">
              <PhoneOff size={40} className="mx-auto text-txt3 mb-3" />
              <p className="text-txt3 text-sm">Zadny kontakt ve fronte</p>
              <button onClick={loadQueue} className="btn-primary text-sm mt-4">
                Znovu nacist frontu
              </button>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-border p-5">
              {/* Callback alert */}
              {currentCallback && (
                <div className="mb-4 flex items-center gap-2 text-sm bg-accent/10 text-accent rounded-xl px-4 py-2.5 border border-accent/20">
                  <AlertCircle size={16} />
                  <span>
                    Naplanovany callback: {new Date(currentCallback.date).toLocaleDateString("cs-CZ")}
                    {currentCallback.time && ` v ${currentCallback.time}`}
                    {currentCallback.note && ` - ${currentCallback.note}`}
                  </span>
                </div>
              )}

              {/* Name & main info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-xl font-bold text-accent shrink-0">
                    {current.firstName?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {current.firstName} {current.lastName}
                      {current.hotCold === "hot" && <Flame size={18} className="text-red" />}
                      {current.hotCold === "cold" && <Snowflake size={18} className="text-blue-400" />}
                    </h2>
                    {current.occupation && (
                      <p className="text-sm text-txt3 mt-0.5">{current.occupation}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${STAGE_COLORS[current.pipelineStage] || "bg-surface3 text-txt3"}`}>
                  {STAGE_LABELS[current.pipelineStage] || current.pipelineStage}
                </span>
              </div>

              {/* Contact details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {current.phone && (
                  <a href={`tel:${current.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Phone size={18} className="text-accent" />
                    </div>
                    <div>
                      <div className="text-[10px] text-txt3 uppercase tracking-wider">Telefon</div>
                      <div className="text-sm font-bold text-accent group-hover:underline">{current.phone}</div>
                    </div>
                  </a>
                )}
                {current.phoneAlt && (
                  <a href={`tel:${current.phoneAlt}`} className="flex items-center gap-3 p-3 rounded-xl bg-surface2 border border-border hover:bg-surface2/80 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-surface3 flex items-center justify-center">
                      <Phone size={18} className="text-txt3" />
                    </div>
                    <div>
                      <div className="text-[10px] text-txt3 uppercase tracking-wider">Alternativni tel.</div>
                      <div className="text-sm font-medium">{current.phoneAlt}</div>
                    </div>
                  </a>
                )}
                {current.email && (
                  <a href={`mailto:${current.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-surface2 border border-border hover:bg-surface2/80 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-surface3 flex items-center justify-center">
                      <Mail size={18} className="text-txt3" />
                    </div>
                    <div>
                      <div className="text-[10px] text-txt3 uppercase tracking-wider">Email</div>
                      <div className="text-sm font-medium truncate">{current.email}</div>
                    </div>
                  </a>
                )}
                {(current.city || current.address) && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface2 border border-border">
                    <div className="w-10 h-10 rounded-xl bg-surface3 flex items-center justify-center">
                      <MapPin size={18} className="text-txt3" />
                    </div>
                    <div>
                      <div className="text-[10px] text-txt3 uppercase tracking-wider">Adresa</div>
                      <div className="text-sm font-medium">{[current.address, current.city].filter(Boolean).join(", ")}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Extra info row */}
              <div className="flex flex-wrap gap-3 text-xs">
                {current.hotCold && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface2 border border-border">
                    <span className="text-txt3">Teplota:</span>
                    <span className={`font-bold ${current.hotCold === "hot" ? "text-red" : current.hotCold === "cold" ? "text-blue-400" : "text-yellow"}`}>
                      {current.hotCold.toUpperCase()}
                    </span>
                  </div>
                )}
                {current.potentialValue > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface2 border border-border">
                    <TrendingUp size={12} className="text-green" />
                    <span className="text-txt3">Hodnota:</span>
                    <span className="font-bold text-green font-mono">{formatCZK(current.potentialValue)}</span>
                  </div>
                )}
                {current.lastContactDate && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface2 border border-border">
                    <Calendar size={12} className="text-txt3" />
                    <span className="text-txt3">Posledni kontakt:</span>
                    <span className="font-medium">{new Date(current.lastContactDate).toLocaleDateString("cs-CZ")}</span>
                  </div>
                )}
                {current.dob && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface2 border border-border">
                    <User size={12} className="text-txt3" />
                    <span className="text-txt3">Narozeni:</span>
                    <span className="font-medium">{new Date(current.dob).toLocaleDateString("cs-CZ")}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {current.note && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 text-[10px] text-txt3 uppercase tracking-wider mb-2">
                    <FileText size={12} />
                    Poznamky ke kontaktu
                  </div>
                  <p className="text-sm text-txt2 whitespace-pre-wrap">{current.note}</p>
                </div>
              )}
            </div>
          )}

          {/* Call script */}
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <FileText size={16} className="text-accent" />
              <h3 className="font-bold text-sm">Hovorovy skript - ECG Build</h3>
            </div>
            <div className="divide-y divide-border">
              {SCRIPT_SECTIONS.map((section, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => toggleScript(idx)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface2/50 transition-colors text-left"
                  >
                    <span className="font-medium text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {section.title}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-txt3 transition-transform duration-200 ${openScripts.has(idx) ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openScripts.has(idx) && (
                    <div className="px-5 pb-4 pl-12">
                      <div className="text-sm text-txt2 whitespace-pre-wrap leading-relaxed bg-surface2/50 rounded-xl p-4 border border-border">
                        {section.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Controls (1/3) ─── */}
        <div className="lg:flex-1 space-y-4">
          {/* Result buttons */}
          <div className="glass rounded-2xl border border-border p-4">
            <div className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-3">Vysledek hovoru</div>
            <div className="grid grid-cols-2 gap-2">
              {CALL_RESULTS.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => saveCallResult(key)}
                  disabled={!current || saving || agentStatus === "paused" || agentStatus === "wrapup"}
                  className={`text-sm font-bold py-3 px-3 rounded-xl border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Note */}
          <div className="glass rounded-2xl border border-border p-4 space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Doba hovoru (sec)</label>
              <input
                type="number"
                value={callDuration || ""}
                onChange={(e) => setCallDuration(Number(e.target.value))}
                placeholder="0"
                className="w-full"
                disabled={agentStatus === "wrapup"}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Poznamka k hovoru</label>
              <textarea
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                placeholder="Poznamky z hovoru..."
                rows={3}
                className="w-full text-sm"
                disabled={agentStatus === "wrapup"}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="glass rounded-2xl border border-border p-4 space-y-2">
            {/* Wrap-up countdown / Next button */}
            {agentStatus === "wrapup" ? (
              <button
                onClick={skipToNext}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/80 transition-all"
              >
                <SkipForward size={16} />
                Dalsi kontakt ({wrapupRemaining}s)
              </button>
            ) : (
              <button
                onClick={skipToNext}
                disabled={!current || agentStatus === "paused"}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <SkipForward size={16} />
                Dalsi kontakt
              </button>
            )}

            {/* Pause toggle */}
            <button
              onClick={togglePause}
              disabled={agentStatus === "wrapup" || agentStatus === "calling"}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                agentStatus === "paused"
                  ? "bg-green/10 text-green border-green/20 hover:bg-green/20"
                  : "bg-red/10 text-red border-red/20 hover:bg-red/20"
              }`}
            >
              {agentStatus === "paused" ? (
                <><Play size={16} /> Pokracovat</>
              ) : (
                <><Pause size={16} /> Pauza</>
              )}
            </button>

            {/* Reload queue */}
            <button
              onClick={loadQueue}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface2 text-txt3 hover:bg-surface3 hover:text-txt transition-all text-xs"
            >
              Znovu nacist frontu
            </button>
          </div>

          {/* Queue info */}
          {queue.length > 0 && (
            <div className="glass rounded-2xl border border-border p-4">
              <div className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-2">Nasledujici ve fronte</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {queue.slice(queueIndex + 1, queueIndex + 6).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-surface2/50">
                    <span className="text-txt3 font-mono w-4">{i + 1}.</span>
                    <span className="font-medium truncate flex-1">{c.firstName} {c.lastName}</span>
                    {c.hotCold === "hot" && <Flame size={10} className="text-red shrink-0" />}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STAGE_COLORS[c.pipelineStage] || "bg-surface3 text-txt3"}`}>
                      {STAGE_LABELS[c.pipelineStage] || c.pipelineStage}
                    </span>
                  </div>
                ))}
                {remaining > 6 && (
                  <div className="text-[10px] text-txt3 text-center pt-1">
                    ... a dalsich {remaining - 6}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Callback picker modal ─── */}
      {showCallbackPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold flex items-center gap-2">
                <Calendar size={18} className="text-accent" />
                Naplanovani callbacku
              </h3>
              <button onClick={() => setShowCallbackPicker(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Datum</label>
                  <input
                    type="date"
                    value={callbackDate}
                    onChange={(e) => setCallbackDate(e.target.value)}
                    className="w-full"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Cas</label>
                  <input
                    type="time"
                    value={callbackTime}
                    onChange={(e) => setCallbackTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Poznamka</label>
                <textarea
                  value={callbackNote}
                  onChange={(e) => setCallbackNote(e.target.value)}
                  placeholder="Duvod callbacku..."
                  rows={2}
                  className="w-full text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowCallbackPicker(false)} className="text-sm px-4 py-2 rounded-xl bg-surface2 text-txt3 hover:bg-surface3 transition-all">
                Zrusit
              </button>
              <button
                onClick={saveCallback}
                disabled={!callbackDate || saving}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? "Ukladam..." : "Ulozit callback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
