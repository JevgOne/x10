"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, FileText, Search, Trash2, X, FolderOpen, ChevronDown } from "lucide-react";

interface Document {
  id: string;
  name: string;
  category: string;
  contactId: string;
  contactFirstName?: string;
  contactLastName?: string;
  uploaderName?: string;
  uploadDate: string;
  note: string;
  createdAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

const CATEGORIES: Record<string, string> = {
  smlouva: "Smlouva",
  nabidka: "Nabidka",
  faktura: "Faktura",
  identifikace: "Identifikace",
  plna_moc: "Plna moc",
  compliance: "Compliance",
  ostatni: "Ostatni",
};

const CAT_COLORS: Record<string, string> = {
  smlouva: "bg-green/10 text-green",
  nabidka: "bg-accent/10 text-accent",
  faktura: "bg-yellow/10 text-yellow",
  identifikace: "bg-purple/10 text-purple",
  plna_moc: "bg-cyan/10 text-cyan",
  compliance: "bg-red/10 text-red",
  ostatni: "bg-surface3 text-txt3",
};

const EMPTY_DOC = { name: "", category: "ostatni", contactId: "", note: "" };

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_DOC);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [dRes, cRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/contacts"),
      ]);
      if (!dRes.ok || !cRes.ok) throw new Error("Chyba načítání");
      const dData = await dRes.json();
      const cData = await cRes.json();
      setDocuments(dData.documents || []);
      setContacts(cData.contacts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba načítání");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          contactId: form.contactId || null,
          note: form.note,
          uploadDate: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Chyba ukládání"); }
      setShowModal(false);
      setForm(EMPTY_DOC);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba ukládání");
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Opravdu smazat tento dokument?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Chyba mazání"); }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba mazání");
    }
  };

  let filtered = documents;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((d) =>
      d.name.toLowerCase().includes(s) ||
      `${d.contactFirstName || ""} ${d.contactLastName || ""}`.toLowerCase().includes(s)
    );
  }
  if (filterCat) {
    filtered = filtered.filter((d) => d.category === filterCat);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = Object.entries(CATEGORIES).map(([key, label]) => ({
    key, label,
    docs: filtered.filter((d) => d.category === key),
  })).filter((g) => g.docs.length > 0);

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20 flex justify-between items-center">
          {error}
          <button onClick={() => setError("")} className="text-red hover:text-red/70"><X size={14} /></button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dokumenty</h1>
          <p className="text-xs text-txt3 mt-1">{documents.length} dokumentu celkem</p>
        </div>
        <button onClick={() => { setForm(EMPTY_DOC); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Novy dokument
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat dokumenty..." className="w-full pl-10" />
        </div>
        <div className="relative">
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="text-sm pr-8 appearance-none">
            <option value="">Vsechny kategorie</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
        </div>
      </div>

      {/* Category stats */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(CATEGORIES).map(([key, label]) => {
          const count = documents.filter((d) => d.category === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilterCat(filterCat === key ? "" : key)}
              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-all ${
                filterCat === key ? CAT_COLORS[key] : "bg-surface2 text-txt3 hover:text-txt"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Document groups */}
      {grouped.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-12 text-center">
          <FolderOpen size={32} className="mx-auto mb-3 text-txt3" />
          <p className="text-txt3 text-sm">Zadne dokumenty</p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${CAT_COLORS[group.key]}`}>
                {group.label}
              </span>
              <span className="text-[10px] text-txt3 font-mono">{group.docs.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.docs.map((doc) => (
                <div key={doc.id} className="glass rounded-xl border border-border p-4 hover:border-border2 transition-all group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-accent shrink-0" />
                      <span className="text-sm font-medium truncate">{doc.name}</span>
                    </div>
                    <button onClick={() => deleteDoc(doc.id)} className="text-txt3 hover:text-red opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {(doc.contactFirstName || doc.contactLastName) && (
                    <p className="text-[11px] text-txt2 mb-1">Kontakt: {doc.contactFirstName} {doc.contactLastName}</p>
                  )}
                  {doc.note && (
                    <p className="text-[11px] text-txt3 line-clamp-2">{doc.note}</p>
                  )}
                  <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-txt3 flex justify-between">
                    <span>{doc.uploadDate && new Date(doc.uploadDate).toLocaleDateString("cs-CZ")}</span>
                    <span>{doc.uploaderName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* New document modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">Novy dokument</h3>
              <button onClick={() => setShowModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Nazev</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Kategorie</label>
                <div className="relative">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full appearance-none pr-8">
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Kontakt</label>
                <div className="relative">
                  <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} className="w-full appearance-none pr-8">
                    <option value="">Zadny</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
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
              <button onClick={save} disabled={saving || !form.name} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukladani..." : "Vytvorit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
