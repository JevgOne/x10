"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Mail, Pencil, Trash2, Eye, ChevronDown } from "lucide-react";

interface Template {
  id: string; name: string; subject: string; body: string;
  campaignId: string; campaignName: string; authorName: string; createdAt: string;
}
interface Campaign { id: string; name: string; }

const VARS = [
  { key: "{{firstName}}", label: "Jméno" },
  { key: "{{lastName}}", label: "Příjmení" },
  { key: "{{phone}}", label: "Telefon" },
  { key: "{{email}}", label: "Email" },
  { key: "{{company}}", label: "Firma" },
  { key: "{{agentName}}", label: "Agent" },
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", campaignId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Template | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/email-templates"),
        fetch("/api/campaigns?status=active"),
      ]);
      if (tRes.ok) setTemplates((await tRes.json()).templates || []);
      if (cRes.ok) setCampaigns((await cRes.json()).campaigns || []);
    } catch { setError("Chyba načítání"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch("/api/email-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...form }),
        });
        if (!res.ok) throw new Error("Chyba ukládání");
      } else {
        const res = await fetch("/api/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Chyba vytváření");
      }
      setShowModal(false); setEditId(null); load();
    } catch { setError("Chyba ukládání"); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Smazat šablonu?")) return;
    await fetch("/api/email-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const openEdit = (t: Template) => {
    setForm({ name: t.name, subject: t.subject, body: t.body, campaignId: t.campaignId || "" });
    setEditId(t.id);
    setShowModal(true);
  };

  const insertVar = (v: string) => setForm({ ...form, body: form.body + v });

  const renderPreview = (text: string) =>
    text.replace(/\{\{firstName\}\}/g, "Jan").replace(/\{\{lastName\}\}/g, "Novák")
      .replace(/\{\{phone\}\}/g, "+420 123 456 789").replace(/\{\{email\}\}/g, "jan@example.com")
      .replace(/\{\{company\}\}/g, "Firma s.r.o.").replace(/\{\{agentName\}\}/g, "Petr Volný");

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Mail size={20} className="text-accent" /> Email šablony</h1>
          <p className="text-xs text-txt3 mt-1">{templates.length} šablon</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setForm({ name: "", subject: "", body: "", campaignId: "" }); setEditId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Nová šablona
          </button>
        )}
      </div>

      {error && (
        <div className="text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20 flex justify-between">
          {error} <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : templates.length === 0 ? (
        <div className="glass rounded-2xl border border-border p-8 text-center text-txt3 text-sm">Žádné šablony</div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="glass rounded-2xl border border-border p-4 hover:border-border2 transition-all group">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-accent shrink-0" />
                    <span className="text-sm font-bold">{t.name}</span>
                    {t.campaignName && <span className="text-[10px] text-accent">{t.campaignName}</span>}
                  </div>
                  <p className="text-xs text-txt2 mt-1">Předmět: {t.subject}</p>
                  <p className="text-[11px] text-txt3 mt-1 line-clamp-2">{t.body.slice(0, 150)}...</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setPreview(t)} className="p-1.5 text-txt3 hover:text-accent"><Eye size={13} /></button>
                    <button onClick={() => openEdit(t)} className="p-1.5 text-txt3 hover:text-accent"><Pencil size={13} /></button>
                    <button onClick={() => del(t.id)} className="p-1.5 text-txt3 hover:text-red"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-txt3 flex gap-3">
                <span>{t.authorName}</span>
                <span>{t.createdAt && new Date(t.createdAt).toLocaleDateString("cs-CZ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">{editId ? "Upravit šablonu" : "Nová šablona"}</h3>
              <button onClick={() => setShowModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Název šablony</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Předmět emailu</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full" />
              </div>
              <div className="relative">
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Kampaň</label>
                <select value={form.campaignId} onChange={e => setForm({ ...form, campaignId: e.target.value })} className="w-full appearance-none pr-8">
                  <option value="">Obecná</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-[calc(50%+8px)] -translate-y-1/2 text-txt3 pointer-events-none" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Tělo emailu</label>
                <div className="flex gap-1 flex-wrap mb-2">
                  {VARS.map(v => (
                    <button key={v.key} type="button" onClick={() => insertVar(v.key)} className="text-[9px] px-2 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-all">
                      {v.label}
                    </button>
                  ))}
                </div>
                <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={10} className="w-full text-xs font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowModal(false)} className="btn-ghost text-sm">Zrušit</button>
              <button onClick={save} disabled={saving || !form.name.trim() || !form.subject.trim() || !form.body.trim()} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukládám..." : editId ? "Uložit" : "Vytvořit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">Náhled: {preview.name}</h3>
              <button onClick={() => setPreview(null)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="mb-3">
                <span className="text-[10px] text-txt3 uppercase tracking-wider">Předmět:</span>
                <p className="text-sm font-medium mt-0.5">{renderPreview(preview.subject)}</p>
              </div>
              <div className="bg-white text-gray-800 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {renderPreview(preview.body)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
