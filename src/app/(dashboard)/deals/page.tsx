"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, X, ChevronDown, Pencil, Trash2, DollarSign, TrendingUp, BarChart3, Briefcase } from "lucide-react";

interface Deal {
  id: string;
  contactId: string;
  agentId: string;
  projectId: string;
  product: string;
  amount: number;
  type: string;
  signDate: string;
  note: string;
  commissionAgent: number;
  commissionSupervisor: number;
  commissionCompany: number;
  createdAt: string;
  contactFirstName?: string;
  contactLastName?: string;
  projectName?: string;
  agentName?: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface AuthUser {
  id: string;
  name: string;
  role: string;
}

const TYPE_LABELS: Record<string, string> = {
  investice: "Investice",
  pojisteni: "Pojisteni",
  sporeni: "Sporeni",
  penze: "Penze",
  hypoteka: "Hypoteka",
  jine: "Jine",
};

const TYPE_COLORS: Record<string, string> = {
  investice: "bg-green/10 text-green",
  pojisteni: "bg-accent/10 text-accent",
  sporeni: "bg-yellow/10 text-yellow",
  penze: "bg-purple/10 text-purple",
  hypoteka: "bg-cyan/10 text-cyan",
  jine: "bg-surface3 text-txt3",
};

function formatCZK(amount: number) {
  if (!amount && amount !== 0) return "";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

const EMPTY_FORM = {
  contactId: "",
  agentId: "",
  projectId: "",
  product: "",
  amount: 0,
  type: "investice",
  signDate: "",
  note: "",
  commissionAgent: 0,
  commissionSupervisor: 0,
  commissionCompany: 0,
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [dRes, cRes, pRes, uRes, meRes] = await Promise.all([
        fetch("/api/deals"),
        fetch("/api/contacts"),
        fetch("/api/projects"),
        fetch("/api/users"),
        fetch("/api/auth/me"),
      ]);

      if (!dRes.ok) throw new Error("Chyba pri nacitani dealu");
      if (!cRes.ok) throw new Error("Chyba pri nacitani kontaktu");
      if (!pRes.ok) throw new Error("Chyba pri nacitani projektu");
      if (!uRes.ok) throw new Error("Chyba pri nacitani uzivatelu");
      if (!meRes.ok) throw new Error("Chyba pri overeni uzivatele");

      const [dData, cData, pData, uData, meData] = await Promise.all([
        dRes.json(),
        cRes.json(),
        pRes.json(),
        uRes.json(),
        meRes.json(),
      ]);

      setDeals(dData.deals || []);
      setContacts(cData.contacts || []);
      setProjects(pData.projects || []);
      setUsers(uData.users || []);
      setAuthUser(meData.user || meData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nastala neocekavana chyba");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNew = () => {
    setEditingDeal(null);
    setForm({
      ...EMPTY_FORM,
      signDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setForm({
      contactId: deal.contactId || "",
      agentId: deal.agentId || "",
      projectId: deal.projectId || "",
      product: deal.product || "",
      amount: deal.amount || 0,
      type: deal.type || "investice",
      signDate: deal.signDate || "",
      note: deal.note || "",
      commissionAgent: deal.commissionAgent || 0,
      commissionSupervisor: deal.commissionSupervisor || 0,
      commissionCompany: deal.commissionCompany || 0,
    });
    setShowModal(true);
  };

  const saveDeal = async () => {
    setSaving(true);
    setError("");
    try {
      const url = editingDeal ? `/api/deals/${editingDeal.id}` : "/api/deals";
      const method = editingDeal ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Chyba pri ukladani dealu");
      }
      setShowModal(false);
      setEditingDeal(null);
      setForm(EMPTY_FORM);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba pri ukladani");
    } finally {
      setSaving(false);
    }
  };

  const deleteDeal = async (id: string) => {
    if (!confirm("Opravdu smazat tento deal?")) return;
    setError("");
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Chyba pri mazani dealu");
      }
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba pri mazani");
    }
  };

  const filtered = deals.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const contactName = `${d.contactFirstName || ""} ${d.contactLastName || ""}`.toLowerCase();
    return contactName.includes(q);
  });

  const totalRevenue = deals.reduce((s, d) => s + (d.amount || 0), 0);
  const avgDealSize = deals.length > 0 ? Math.round(totalRevenue / deals.length) : 0;
  const totalCommission = deals.reduce(
    (s, d) => s + (d.commissionAgent || 0) + (d.commissionSupervisor || 0) + (d.commissionCompany || 0),
    0
  );

  const isAgent = authUser?.role === "agent";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <div className="bg-red/10 border border-red/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-red text-sm">{error}</span>
          <button onClick={() => setError("")} className="text-red hover:text-red/70">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Dealy</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> <span className="hidden sm:inline">Novy deal</span><span className="sm:hidden">Novy</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl border border-border p-4 stat-blue">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={14} className="text-accent" />
            <span className="text-[10px] text-txt3 uppercase tracking-wider">Celkem dealu</span>
          </div>
          <div className="text-xl font-bold">{deals.length}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4 stat-green">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-green" />
            <span className="text-[10px] text-txt3 uppercase tracking-wider">Celkovy obrat</span>
          </div>
          <div className="text-xl font-bold text-green">{formatCZK(totalRevenue)}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4 stat-purple">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-purple" />
            <span className="text-[10px] text-txt3 uppercase tracking-wider">Prumerny deal</span>
          </div>
          <div className="text-xl font-bold text-purple">{formatCZK(avgDealSize)}</div>
        </div>
        <div className="glass rounded-xl border border-border p-4 stat-yellow">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-yellow" />
            <span className="text-[10px] text-txt3 uppercase tracking-wider">Provize celkem</span>
          </div>
          <div className="text-xl font-bold text-yellow">{formatCZK(totalCommission)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat podle jmena kontaktu..."
            className="w-full pl-10"
          />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-4 py-2.5 text-[10px] font-semibold text-txt3 uppercase tracking-wider border-b border-border">
          <span>Kontakt</span>
          <span>Agent</span>
          <span>Projekt</span>
          <span>Produkt</span>
          <span className="text-right">Castka</span>
          <span>Typ</span>
          <span>Datum podpisu</span>
          <span className="text-right">Akce</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-txt3 text-sm">Zadne dealy</div>
        ) : (
          filtered.map((deal) => (
            <div key={deal.id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
              {/* Desktop table row */}
              <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-4 py-3 text-sm items-center">
                {/* Contact */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                    {deal.contactFirstName?.charAt(0) || "?"}
                  </div>
                  <span className="font-medium truncate">
                    {deal.contactFirstName || deal.contactLastName
                      ? `${deal.contactFirstName || ""} ${deal.contactLastName || ""}`.trim()
                      : "\u2014"}
                  </span>
                </div>
                {/* Agent */}
                <div className="text-xs text-txt2 truncate">{deal.agentName || "\u2014"}</div>
                {/* Project */}
                <div className="text-xs text-txt2 truncate">{deal.projectName || "\u2014"}</div>
                {/* Product */}
                <div className="text-xs text-txt2 truncate">{deal.product || "\u2014"}</div>
                {/* Amount */}
                <div className="text-right text-xs font-mono text-green font-semibold">
                  {formatCZK(deal.amount)}
                </div>
                {/* Type */}
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[deal.type] || "bg-surface3 text-txt3"}`}>
                    {TYPE_LABELS[deal.type] || deal.type || "\u2014"}
                  </span>
                </div>
                {/* Sign Date */}
                <div className="text-xs text-txt2">
                  {deal.signDate ? new Date(deal.signDate).toLocaleDateString("cs-CZ") : "\u2014"}
                </div>
                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(deal)}
                    className="p-1.5 rounded-lg hover:bg-surface3 text-txt3 hover:text-accent transition-colors"
                    title="Upravit"
                  >
                    <Pencil size={14} />
                  </button>
                  {!isAgent && (
                    <button
                      onClick={() => deleteDeal(deal.id)}
                      className="p-1.5 rounded-lg hover:bg-red/10 text-txt3 hover:text-red transition-colors"
                      title="Smazat"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile card */}
              <div className="md:hidden px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {deal.contactFirstName?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {deal.contactFirstName || deal.contactLastName
                          ? `${deal.contactFirstName || ""} ${deal.contactLastName || ""}`.trim()
                          : "\u2014"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[deal.type] || "bg-surface3 text-txt3"}`}>
                        {TYPE_LABELS[deal.type] || deal.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-txt3">
                      {deal.agentName && <span>{deal.agentName}</span>}
                      {deal.projectName && <span>{deal.projectName}</span>}
                      {deal.signDate && <span>{new Date(deal.signDate).toLocaleDateString("cs-CZ")}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-mono text-green font-semibold">{formatCZK(deal.amount)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(deal)}
                        className="p-1 rounded-lg hover:bg-surface3 text-txt3 hover:text-accent transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      {!isAgent && (
                        <button
                          onClick={() => deleteDeal(deal.id)}
                          className="p-1 rounded-lg hover:bg-red/10 text-txt3 hover:text-red transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {deal.product && (
                  <p className="mt-1.5 ml-12 text-xs text-txt3 truncate">{deal.product}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: New / Edit deal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">{editingDeal ? "Upravit deal" : "Novy deal"}</h3>
              <button onClick={() => { setShowModal(false); setEditingDeal(null); }} className="text-txt3 hover:text-txt">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Contact */}
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

              {/* Agent + Project */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Agent</label>
                  <div className="relative">
                    <select
                      value={form.agentId}
                      onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                      className="w-full appearance-none pr-8"
                    >
                      <option value="">Vyberte agenta</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Projekt</label>
                  <div className="relative">
                    <select
                      value={form.projectId}
                      onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                      className="w-full appearance-none pr-8"
                    >
                      <option value="">Vyberte projekt</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Product + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Produkt</label>
                  <input
                    value={form.product}
                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                    placeholder="Nazev produktu"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Castka (CZK)</label>
                  <input
                    type="number"
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Type + Sign Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Typ</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full appearance-none pr-8"
                    >
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Datum podpisu</label>
                  <input
                    type="date"
                    value={form.signDate}
                    onChange={(e) => setForm({ ...form, signDate: e.target.value })}
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
                  rows={2}
                  className="w-full"
                />
              </div>

              {/* Commission fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Provize agent</label>
                  <input
                    type="number"
                    value={form.commissionAgent || ""}
                    onChange={(e) => setForm({ ...form, commissionAgent: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Provize supervisor</label>
                  <input
                    type="number"
                    value={form.commissionSupervisor || ""}
                    onChange={(e) => setForm({ ...form, commissionSupervisor: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Provize firma</label>
                  <input
                    type="number"
                    value={form.commissionCompany || ""}
                    onChange={(e) => setForm({ ...form, commissionCompany: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => { setShowModal(false); setEditingDeal(null); }} className="btn-ghost text-sm">Zrusit</button>
              <button
                onClick={saveDeal}
                disabled={saving}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? "Ukladani..." : editingDeal ? "Ulozit zmeny" : "Vytvorit deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
