"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, X, Shield, UserCog, Check, Ban } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervizor",
  agent: "Agent",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red/10 text-red border-red/20",
  supervisor: "bg-purple/10 text-purple border-purple/20",
  agent: "bg-accent/10 text-accent border-accent/20",
};

const EMPTY_USER = { name: "", email: "", password: "", role: "agent", phone: "" };

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_USER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm(EMPTY_USER);
    setEditId(null);
    setError("");
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone || "" });
    setEditId(u.id);
    setError("");
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");

    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/users/${editId}` : "/api/users";
    const body: Record<string, string> = { name: form.name, email: form.email, role: form.role, phone: form.phone };
    if (form.password) body.password = form.password;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Chyba");
      return;
    }

    setShowModal(false);
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    load();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Opravdu deaktivovat tohoto uzivatele?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeUsers = users.filter((u) => u.active !== false);
  const inactiveUsers = users.filter((u) => u.active === false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Uzivatele & Nastaveni</h1>
          <p className="text-sm text-txt3 mt-1">Sprava uzivatelskych uctu a roli</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Novy uzivatel
        </button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(ROLE_LABELS).map(([key, label]) => {
          const count = activeUsers.filter((u) => u.role === key).length;
          return (
            <div key={key} className="glass rounded-2xl border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  key === "admin" ? "bg-red/10" : key === "supervisor" ? "bg-purple/10" : "bg-accent/10"
                }`}>
                  {key === "admin" ? <Shield size={18} className="text-red" /> :
                   <UserCog size={18} className={key === "supervisor" ? "text-purple" : "text-accent"} />}
                </div>
                <div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-[10px] text-txt3 uppercase tracking-wider">{label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active users */}
      <div>
        <h2 className="text-sm font-bold mb-3">Aktivni uzivatele</h2>
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_100px] gap-3 px-5 py-3 text-[10px] font-semibold text-txt3 uppercase tracking-wider border-b border-border">
            <span>Jmeno</span><span>Email</span><span>Role</span><span>Telefon</span><span className="text-right">Akce</span>
          </div>

          {activeUsers.map((u) => (
            <div key={u.id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors group">
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_100px] gap-3 px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <span className="font-medium truncate">{u.name}</span>
                </div>
                <div className="flex items-center text-txt2 text-xs truncate">{u.email}</div>
                <div className="flex items-center">
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${ROLE_COLORS[u.role] || "bg-surface3 text-txt3"}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>
                <div className="flex items-center text-xs text-txt2">{u.phone || "—"}</div>
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(u)} className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-accent" title="Upravit">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deleteUser(u.id)} className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-red" title="Deaktivovat">
                    <Ban size={12} />
                  </button>
                </div>
              </div>
              {/* Mobile card */}
              <div className="md:hidden px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{u.name}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${ROLE_COLORS[u.role] || "bg-surface3 text-txt3"}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </div>
                    <div className="text-xs text-txt3 mt-0.5 truncate">{u.email}</div>
                    {u.phone && <div className="text-xs text-txt3 mt-0.5">{u.phone}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(u)} className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-accent" title="Upravit">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-red" title="Deaktivovat">
                      <Ban size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {activeUsers.length === 0 && (
            <div className="p-8 text-center text-txt3 text-sm">Zadni aktivni uzivatele</div>
          )}
        </div>
      </div>

      {/* Inactive users */}
      {inactiveUsers.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 text-txt3">Neaktivni uzivatele</h2>
          <div className="glass rounded-2xl border border-border overflow-hidden opacity-60">
            {inactiveUsers.map((u) => (
              <div key={u.id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors group">
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_100px] gap-3 px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface3 flex items-center justify-center text-xs font-bold text-txt3 shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <span className="text-txt3 truncate">{u.name}</span>
                  </div>
                  <div className="flex items-center text-txt3 text-xs truncate">{u.email}</div>
                  <div className="flex items-center">
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-surface3 text-txt3">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-txt3">{u.phone || "—"}</div>
                  <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleActive(u.id, u.active)} className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-green" title="Aktivovat">
                      <Check size={12} />
                    </button>
                  </div>
                </div>
                {/* Mobile card */}
                <div className="md:hidden px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface3 flex items-center justify-center text-xs font-bold text-txt3 shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-txt3 text-sm truncate">{u.name}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-surface3 text-txt3">
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </div>
                      <div className="text-xs text-txt3 mt-0.5 truncate">{u.email}</div>
                    </div>
                    <button onClick={() => toggleActive(u.id, u.active)} className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-green shrink-0" title="Aktivovat">
                      <Check size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">{editId ? "Upravit uzivatele" : "Novy uzivatel"}</h3>
              <button onClick={() => setShowModal(false)} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Jmeno</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">
                  Heslo {editId && <span className="normal-case">(ponechte prazdne pro zachovani)</span>}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full" placeholder={editId ? "••••••••" : ""} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Role</label>
                <div className="flex gap-2">
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, role: key })}
                      className={`flex-1 text-xs font-bold py-2.5 rounded-xl border transition-all ${
                        form.role === key
                          ? ROLE_COLORS[key]
                          : "border-border text-txt3 hover:border-border2"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Telefon</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" />
              </div>

              {error && (
                <div className="text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20">{error}</div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setShowModal(false)} className="btn-ghost text-sm">Zrusit</button>
              <button onClick={save} disabled={saving || !form.name || !form.email || (!editId && !form.password)} className="btn-primary text-sm disabled:opacity-50">
                {saving ? "Ukladani..." : editId ? "Ulozit" : "Vytvorit ucet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
