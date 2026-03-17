"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Search, BookOpen, ChevronDown, Pencil, Trash2, ChevronRight } from "lucide-react";

interface Article {
  id: string; campaignId: string; title: string; content: string;
  category: string; sortOrder: number; createdAt: string; campaignName: string;
}

interface Campaign { id: string; name: string; }

const CATEGORIES: Record<string, string> = {
  faq: "FAQ", product: "Produkt", process: "Proces", general: "Obecné",
};

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [search, setSearch] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "general", campaignId: "", sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user || null)).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCampaign) params.set("campaignId", filterCampaign);
      if (filterCategory) params.set("category", filterCategory);
      const [aRes, cRes] = await Promise.all([
        fetch(`/api/knowledge-base?${params}`),
        fetch("/api/campaigns?status=active"),
      ]);
      if (aRes.ok) setArticles((await aRes.json()).articles || []);
      if (cRes.ok) setCampaigns((await cRes.json()).campaigns || []);
    } catch { setError("Chyba načítání"); }
    finally { setLoading(false); }
  }, [filterCampaign, filterCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())
  );

  const saveArticle = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const url = editId ? `/api/knowledge-base/${editId}` : "/api/knowledge-base";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowModal(false); setEditId(null); loadData(); }
    } catch { setError("Chyba uložení"); }
    setSaving(false);
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Smazat článek?")) return;
    await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
    loadData();
  };

  const openEdit = (a: Article) => {
    setForm({ title: a.title, content: a.content, category: a.category, campaignId: a.campaignId || "", sortOrder: a.sortOrder });
    setEditId(a.id);
    setShowModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen size={20} className="text-accent" /> Knowledge Base</h1>
          <p className="text-xs text-txt3 mt-1">{filtered.length} článků</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setForm({ title: "", content: "", category: "general", campaignId: "", sortOrder: 0 }); setEditId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Nový článek
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20 flex justify-between">
          {error} <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat v KB..." className="w-full pl-10" />
        </div>
        <div className="relative">
          <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="text-sm pr-8 appearance-none">
            <option value="">Všechny kampaně</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-sm pr-8 appearance-none">
            <option value="">Všechny kategorie</option>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-2">
        {loading ? (
          <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl border border-border p-8 text-center text-txt3 text-sm">Žádné články</div>
        ) : filtered.map(a => (
          <div key={a.id} className="glass rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface2/30 transition-colors"
            >
              <ChevronRight size={14} className={`text-txt3 transition-transform ${expandedId === a.id ? "rotate-90" : ""}`} />
              <BookOpen size={16} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{a.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-txt3">{CATEGORIES[a.category] || a.category}</span>
                  {a.campaignName && <span className="text-[10px] text-accent">{a.campaignName}</span>}
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(a)} className="p-1 text-txt3 hover:text-accent"><Pencil size={12} /></button>
                  <button onClick={() => deleteArticle(a.id)} className="p-1 text-txt3 hover:text-red"><Trash2 size={12} /></button>
                </div>
              )}
            </button>
            {expandedId === a.id && (
              <div className="px-4 pb-4 pl-12">
                <div className="text-xs text-txt2 whitespace-pre-wrap leading-relaxed">{a.content}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">{editId ? "Upravit článek" : "Nový článek"}</h3>
              <button onClick={() => setShowModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Název</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Kategorie</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Kampaň</label>
                  <select value={form.campaignId} onChange={e => setForm({ ...form, campaignId: e.target.value })} className="w-full">
                    <option value="">Obecný</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Obsah</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={10} className="w-full text-xs" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowModal(false)} className="btn-ghost text-sm">Zrušit</button>
              <button onClick={saveArticle} disabled={saving || !form.title.trim() || !form.content.trim()} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukládám..." : editId ? "Uložit" : "Vytvořit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
