"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Phone, Mail, MapPin, ChevronRight } from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  pipeline_stage: string;
  hot_cold: string;
  potential_value: number;
  project_id: string;
  created_at: string;
}

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

function formatCZK(amount: number) {
  if (!amount) return "";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contact | null>(null);

  const loadContacts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadContacts, 300);
    return () => clearTimeout(t);
  }, [loadContacts]);

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Kontakty</h1>
          <button className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
            <Plus size={16} /> Nový kontakt
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat kontakty..."
            className="w-full pl-10"
          />
        </div>

        {/* Table */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-2 px-4 py-2 text-xs font-semibold text-txt3 border-b border-border">
            <span>Jméno</span>
            <span>Kontakt</span>
            <span>Město</span>
            <span>Stage</span>
            <span className="text-right">Hodnota</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-txt3">Načítání...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-txt3">Žádné kontakty</div>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-2 px-4 py-3 text-sm border-b border-border cursor-pointer transition-colors hover:bg-surface2 ${
                  selected?.id === c.id ? "bg-surface2" : ""
                }`}
              >
                <div>
                  <span className="font-medium">{c.first_name} {c.last_name}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-xs text-txt2">
                  {c.phone && <span className="flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1 truncate"><Mail size={10} />{c.email}</span>}
                </div>
                <div className="flex items-center gap-1 text-xs text-txt2">
                  {c.city && <><MapPin size={10} />{c.city}</>}
                </div>
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_COLORS[c.pipeline_stage] || "bg-surface3 text-txt3"}`}>
                    {STAGE_LABELS[c.pipeline_stage] || c.pipeline_stage}
                  </span>
                </div>
                <div className="text-right text-xs font-mono text-green">
                  {formatCZK(c.potential_value)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0">
          <div className="bg-surface rounded-xl border border-border p-4 sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{selected.first_name} {selected.last_name}</h3>
              <button onClick={() => setSelected(null)} className="text-txt3 hover:text-txt">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {selected.phone && (
                <div className="flex items-center gap-2 text-txt2">
                  <Phone size={14} className="text-accent" />
                  <a href={`tel:${selected.phone}`} className="hover:text-accent">{selected.phone}</a>
                </div>
              )}
              {selected.email && (
                <div className="flex items-center gap-2 text-txt2">
                  <Mail size={14} className="text-accent" />
                  <a href={`mailto:${selected.email}`} className="hover:text-accent truncate">{selected.email}</a>
                </div>
              )}
              {selected.city && (
                <div className="flex items-center gap-2 text-txt2">
                  <MapPin size={14} className="text-accent" />
                  <span>{selected.city}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-txt3">Stage</span>
                  <span className={`px-2 py-0.5 rounded-full ${STAGE_COLORS[selected.pipeline_stage] || ""}`}>
                    {STAGE_LABELS[selected.pipeline_stage]}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-txt3">Hodnota</span>
                  <span className="text-green font-mono">{formatCZK(selected.potential_value)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
