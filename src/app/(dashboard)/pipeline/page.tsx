"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, Mail, GripVertical, User, ChevronDown } from "lucide-react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  pipelineStage: string;
  hotCold: string;
  potentialValue: number;
  projectId: string;
  agentId: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

const STAGES = [
  { key: "novy", label: "Novy", color: "border-blue-500/30", dot: "bg-blue-500" },
  { key: "kontaktovany", label: "Kontaktovany", color: "border-cyan-500/30", dot: "bg-cyan-500" },
  { key: "zajem", label: "Zajem", color: "border-yellow-500/30", dot: "bg-yellow-500" },
  { key: "nabidka", label: "Nabidka", color: "border-orange-500/30", dot: "bg-orange-500" },
  { key: "jednani", label: "Jednani", color: "border-purple-500/30", dot: "bg-purple-500" },
  { key: "smlouva", label: "Smlouva", color: "border-indigo-500/30", dot: "bg-indigo-500" },
  { key: "uzavreno", label: "Uzavreno", color: "border-green-500/30", dot: "bg-green-500" },
  { key: "ztraceno", label: "Ztraceno", color: "border-red-500/30", dot: "bg-red-500" },
];

function formatCZK(amount: number) {
  if (!amount) return "";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);
}

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterProject) params.set("projectId", filterProject);
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/contacts?${params}`),
      fetch("/api/projects"),
    ]);
    const cData = await cRes.json();
    const pData = await pRes.json();
    setContacts(cData.contacts || []);
    setProjects(pData.projects || []);
    setLoading(false);
  }, [filterProject]);

  useEffect(() => { load(); }, [load]);

  const moveContact = async (contactId: string, newStage: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, pipelineStage: newStage } : c))
    );
    await fetch(`/api/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: newStage }),
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOver(stage);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (dragItem) moveContact(dragItem, stage);
    setDragItem(null);
    setDragOver(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalValue = contacts.reduce((s, c) => s + (c.potentialValue || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pipeline</h1>
          <p className="text-xs text-txt3 mt-1">{contacts.length} kontaktu &middot; {formatCZK(totalValue)} celkova hodnota</p>
        </div>
        <div className="relative">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-sm pr-8 appearance-none"
          >
            <option value="">Vsechny projekty</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
        {STAGES.map((stage) => {
          const stageContacts = contacts.filter((c) => c.pipelineStage === stage.key);
          const stageValue = stageContacts.reduce((s, c) => s + (c.potentialValue || 0), 0);

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-[230px] flex flex-col rounded-2xl border transition-colors ${
                dragOver === stage.key ? "border-accent bg-accent/5" : "border-border bg-surface/50"
              }`}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              {/* Column header */}
              <div className={`p-3 border-b ${stage.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">{stage.label}</span>
                  <span className="ml-auto text-[10px] font-mono text-txt3 bg-surface3 rounded-full px-2 py-0.5">
                    {stageContacts.length}
                  </span>
                </div>
                {stageValue > 0 && (
                  <div className="text-[10px] text-txt3 font-mono">{formatCZK(stageValue)}</div>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {stageContacts.map((contact) => (
                  <div
                    key={contact.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, contact.id)}
                    onDragEnd={() => { setDragItem(null); setDragOver(null); }}
                    className={`glass rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:border-border2 group ${
                      dragItem === contact.id ? "opacity-40 scale-95" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical size={12} className="text-txt3/50 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center shrink-0">
                            <User size={10} className="text-accent" />
                          </div>
                          <span className="text-[12px] font-semibold truncate">
                            {contact.firstName} {contact.lastName}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {contact.phone && (
                            <div className="flex items-center gap-1.5 text-[10px] text-txt3">
                              <Phone size={9} /> {contact.phone}
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-1.5 text-[10px] text-txt3 truncate">
                              <Mail size={9} /> {contact.email}
                            </div>
                          )}
                        </div>
                        {contact.potentialValue > 0 && (
                          <div className="mt-2 text-[10px] font-mono text-green">
                            {formatCZK(contact.potentialValue)}
                          </div>
                        )}
                        {contact.hotCold && contact.hotCold !== "warm" && (
                          <span className={`inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            contact.hotCold === "hot" ? "bg-red/10 text-red" : "bg-blue-500/10 text-blue-400"
                          }`}>
                            {contact.hotCold === "hot" ? "HOT" : "COLD"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {stageContacts.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-txt3/50">Prazdne</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
