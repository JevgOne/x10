"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Upload, Database, Search, Trash2, X, FileSpreadsheet, Check, AlertCircle, ChevronDown, ChevronUp, Plus, Users, Phone, Mail, Calendar, Eye } from "lucide-react";
import * as XLSX from "xlsx";

interface DatabaseRecord {
  id: string;
  name: string;
  source: string;
  projectId: string;
  projectName?: string;
  agentName?: string;
  contactCount: number;
  active: boolean;
  uploadDate: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  pipelineStage: string;
  hotCold: string;
  potentialValue: number;
}

interface ParsedContact {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  potentialValue: number;
  pipelineStage: string;
  hotCold: string;
  occupation: string;
  note: string;
  valid: boolean;
  rawExtra: Record<string, string>;
}

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

// Map Czech stage names to pipeline stage keys
const STAGE_MAP: Record<string, string> = {
  "novy": "novy", "nový": "novy", "new": "novy",
  "kontaktovany": "kontaktovany", "kontaktovaný": "kontaktovany", "contacted": "kontaktovany",
  "zajem": "zajem", "zájem": "zajem", "interest": "zajem",
  "nabidka": "nabidka", "nabídka": "nabidka", "offer": "nabidka",
  "jednani": "jednani", "jednání": "jednani", "meeting": "jednani", "negotiation": "jednani",
  "smlouva": "smlouva", "contract": "smlouva",
  "uzavreno": "uzavreno", "uzavřeno": "uzavreno", "closed": "uzavreno",
  "ziskano": "uzavreno", "získáno": "uzavreno", "won": "uzavreno", "gained": "uzavreno",
  "ztraceno": "ztraceno", "lost": "ztraceno", "ztracený": "ztraceno",
};

function parseStage(val: string): string {
  const clean = val.trim().toLowerCase();
  return STAGE_MAP[clean] || "";
}

function parseCurrencyValue(val: string): number {
  // Handle values like "280 000.00 Kč", "250000", "1 650 000 CZK"
  const cleaned = String(val || "")
    .replace(/[kKčČcCzZkK€$]/gi, "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const match = cleaned.match(/[\d.]+/);
  if (!match) return 0;
  return Math.round(parseFloat(match[0])) || 0;
}

function isPhoneLike(v: string): boolean {
  const stripped = v.replace(/[\s\-\(\)\+\.]/g, "");
  return /^\d{9,15}$/.test(stripped);
}

function isEmailLike(v: string): boolean {
  return /^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(v.trim());
}

function inferColumnType(values: string[], colIndex: number, assigned: Set<string>): string {
  if (values.length === 0) return `__col${colIndex}`;
  const total = values.length;
  const rate = (fn: (v: string) => boolean) => values.filter(fn).length / total;

  const phoneRate = rate(isPhoneLike);
  const emailRate = rate(isEmailLike);
  const stageRate = rate(v => STAGE_MAP[v.trim().toLowerCase()] != null);
  const genderRate = rate(v => /^[ČčMmŽž]$/.test(v.trim()));
  const numericRate = rate(v => {
    const cleaned = v.replace(/[\s.,kKčČcCzZkK€$]/gi, "");
    return /^\d{4,}$/.test(cleaned);
  });
  const textRate = rate(v =>
    /^[A-Za-z\u00C0-\u024F\s.'\-]+$/.test(v) && v.length > 1 && !/\d/.test(v)
  );

  const MIN = 0.3;
  if (phoneRate >= MIN && !assigned.has("telefon")) return "telefon";
  if (emailRate >= MIN && !assigned.has("email")) return "email";
  if (stageRate >= MIN && !assigned.has("stav")) return "stav";
  if (genderRate >= MIN && !assigned.has("pohlavi")) return "pohlavi";
  if (numericRate >= MIN && !assigned.has("hodnota")) return "hodnota";
  if (textRate >= MIN && !assigned.has("jmeno")) return "jmeno";
  if (textRate >= MIN && !assigned.has("mesto")) return "mesto";
  return `__col${colIndex}`;
}

function parseContactRows(rawRows: unknown[][]): ParsedContact[] {
  if (rawRows.length === 0) return [];

  const firstRow = (rawRows[0] as unknown[]).map(v => String(v ?? "").trim());

  // Detect if first row is a header row
  const knownHeaderRe = /^(jm[eé]no|name|p[rř][ií]jmen[ií]|kontakt|tel(efon)?|phone|mobil|email|e-?mail|adresa|address|m[eě]sto|city|obec|stav|stage|hodnota|value|[čc][aá]stka|amount|investice|velikost|suma|objem|k[čc]|czk|cena|price|ps[čc]|zip|povol[aá]n[ií]|pozn[aá]mka|note|k[rř]estn[ií]|first|last|f[aá]ze|pozice|pr[aá]ce|datum|pohlav[ií]|gender|teplota|temperature|typ|status|pipeline|z[ií]sk[aá]no|etapa)$/i;
  const headerLikeCount = firstRow.filter(v => v && knownHeaderRe.test(v)).length;
  const dataLikeCount = firstRow.filter(v => isPhoneLike(v) || isEmailLike(v)).length;
  const hasHeaders = headerLikeCount >= 2 && dataLikeCount === 0;

  let rows: Record<string, string>[];

  if (hasHeaders) {
    // First row is headers, rest is data
    const headerRow = firstRow;
    rows = rawRows.slice(1).map(row => {
      const obj: Record<string, string> = {};
      headerRow.forEach((h, i) => {
        obj[h] = String((row as unknown[])[i] ?? "").trim();
      });
      return obj;
    });
  } else {
    // Headerless file: infer column types from data values
    const colCount = Math.max(...rawRows.slice(0, 50).map(r => (r as unknown[]).length));
    const sampleSize = Math.min(20, rawRows.length);
    const assigned = new Set<string>();
    const colNames: string[] = [];

    for (let col = 0; col < colCount; col++) {
      const sampleValues = rawRows
        .slice(0, sampleSize)
        .map(r => String((r as unknown[])[col] ?? "").trim())
        .filter(v => v.length > 0);
      const name = inferColumnType(sampleValues, col, assigned);
      assigned.add(name);
      colNames.push(name);
    }

    rows = rawRows.map(row => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < colCount; i++) {
        obj[colNames[i]] = String((row as unknown[])[i] ?? "").trim();
      }
      return obj;
    });
  }

  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const detect = (patterns: RegExp[]) =>
    headers.find((h) => patterns.some((p) => p.test(h.toLowerCase())));

  const nameCol = detect([/jmeno|jméno|name|příjmení|prijmeni|kontakt/i]);
  const firstNameCol = detect([/křestní|krestni|first/i]);
  const lastNameCol = detect([/příjmení|prijmeni|last/i]);
  const phoneCol = detect([/tel|phone|mobil|číslo|cislo/i]);
  const emailCol = detect([/email|mail|e-mail/i]);
  const cityCol = detect([/město|mesto|city|obec/i]);
  const addressCol = detect([/adresa|address|ulice/i]);
  const valueCol = detect([/hodnota|value|castka|částka|amount|investice|velikost|suma|objem|kč|czk|cena|price/i]);
  const stageCol = detect([/stav|stage|fáze|faze|status|pipeline|získáno|ziskano|fáze|etapa/i]);
  const occupationCol = detect([/povolání|povolani|occupation|profese|job|práce|prace|pozice/i]);
  const noteCol = detect([/poznamka|poznámka|note|notes|komentář|komentar|popis/i]);
  const hotColdCol = detect([/teplota|temperature|hot|cold|warm|typ\s*kontaktu/i]);

  const phoneRegex = /(?:\+?\d[\d\s\-()]{6,})/;
  const emailRegex = /[\w.+-]+@[\w.-]+\.\w+/;

  // Auto-detect value column by checking first row for currency-like values
  let autoValueCol: string | undefined;
  if (!valueCol) {
    for (const h of headers) {
      const val = String(rows[0][h] || "");
      if (/\d[\d\s]*[.,]\d{2}\s*(kč|czk|Kč)/i.test(val) || /^\d[\d\s]{3,}$/.test(val.trim())) {
        autoValueCol = h;
        break;
      }
    }
  }
  const effectiveValueCol = valueCol || autoValueCol;

  // Auto-detect stage column by checking if column values match known stages
  let autoStageCol: string | undefined;
  if (!stageCol) {
    for (const h of headers) {
      const val = String(rows[0][h] || "").trim().toLowerCase();
      if (STAGE_MAP[val]) {
        autoStageCol = h;
        break;
      }
    }
  }
  const effectiveStageCol = stageCol || autoStageCol;

  // Track which columns were used for specific fields
  const usedCols = new Set([nameCol, firstNameCol, lastNameCol, phoneCol, emailCol, cityCol, addressCol, effectiveValueCol, effectiveStageCol, occupationCol, noteCol, hotColdCol].filter(Boolean));

  return rows.map((row) => {
    let firstName = "", lastName = "", phone = "", email = "", city = "", address = "";
    let potentialValue = 0, pipelineStage = "", hotCold = "", occupation = "", note = "";

    if (firstNameCol && lastNameCol) {
      firstName = String(row[firstNameCol] || "").trim();
      lastName = String(row[lastNameCol] || "").trim();
    } else if (nameCol) {
      const full = String(row[nameCol] || "").trim()
        .replace(/(?:^|\s)(ing|mgr|bc|mudr|judr|phdr|doc|prof|rndr|paeddr|thdr|rsdr|mvdr|phardr)\.?\s*/gi, "");
      const parts = full.split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ");
    }

    if (phoneCol) phone = String(row[phoneCol] || "").trim();
    if (!phone) {
      const allText = Object.values(row).join(" ");
      const m = allText.match(phoneRegex);
      if (m) phone = m[0].trim();
    }

    if (emailCol) email = String(row[emailCol] || "").trim();
    if (!email) {
      const allText = Object.values(row).join(" ");
      const m = allText.match(emailRegex);
      if (m) email = m[0].trim();
    }

    if (cityCol) city = String(row[cityCol] || "").trim();
    if (addressCol) address = String(row[addressCol] || "").trim();

    if (effectiveValueCol) {
      potentialValue = parseCurrencyValue(String(row[effectiveValueCol] || ""));
    }

    if (effectiveStageCol) {
      pipelineStage = parseStage(String(row[effectiveStageCol] || ""));
    }

    if (occupationCol) occupation = String(row[occupationCol] || "").trim();
    if (noteCol) note = String(row[noteCol] || "").trim();
    if (hotColdCol) {
      const hc = String(row[hotColdCol] || "").trim().toLowerCase();
      if (hc === "hot" || hc === "horký" || hc === "horky") hotCold = "hot";
      else if (hc === "cold" || hc === "studený" || hc === "studeny") hotCold = "cold";
      else if (hc === "warm" || hc === "teplý" || hc === "teply") hotCold = "warm";
    }

    // Fallback name detection
    if (!firstName && !lastName) {
      for (const h of headers) {
        const val = String(row[h] || "").trim();
        if (val && !phoneRegex.test(val) && !emailRegex.test(val) && /^[A-Za-z\u00C0-\u024F\s.]+$/.test(val) && val.length > 2) {
          const cleaned = val.replace(/(?:^|\s)(ing|mgr|bc|mudr|judr|phdr|doc|prof)\.?\s*/gi, "").trim();
          const parts = cleaned.split(/\s+/);
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ");
          break;
        }
      }
    }

    // Collect extra columns not mapped to specific fields
    const rawExtra: Record<string, string> = {};
    for (const h of headers) {
      if (!usedCols.has(h)) {
        const val = String(row[h] || "").trim();
        if (val) rawExtra[h] = val;
      }
    }

    const valid = !!(firstName || lastName) && !!(phone || email);
    return { firstName, lastName, phone, email, city, address, potentialValue, pipelineStage, hotCold, occupation, note, valid, rawExtra };
  });
}

function smartParseXLSX(data: ArrayBuffer): ParsedContact[] {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  return parseContactRows(rawRows);
}

async function smartParseDOCX(data: ArrayBuffer): Promise<ParsedContact[]> {
  const mammoth = await import("mammoth/mammoth.browser");
  const convert = mammoth.default?.convertToHtml || mammoth.convertToHtml;
  const extractText = mammoth.default?.extractRawText || mammoth.extractRawText;

  const result = await convert({ arrayBuffer: data });
  const html = result.value;

  // Try to extract tables from HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table");

  if (tables.length > 0) {
    // Use the largest table
    let bestTable = tables[0];
    tables.forEach(t => {
      if (t.rows.length > bestTable.rows.length) bestTable = t;
    });

    const rawRows: unknown[][] = Array.from(bestTable.rows).map(row =>
      Array.from(row.cells).map(cell => (cell.textContent || "").trim())
    );
    return parseContactRows(rawRows);
  }

  // No tables - parse text lines
  const textResult = await extractText({ arrayBuffer: data });
  const lines = textResult.value.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  // Split lines by tabs, semicolons, or commas
  const rawRows: unknown[][] = lines.map((line: string) => {
    if (line.includes("\t")) return line.split("\t").map(v => v.trim());
    if (line.includes(";")) return line.split(";").map(v => v.trim());
    // For comma: only split if line has multiple comma-separated segments
    const commaCount = (line.match(/,/g) || []).length;
    if (commaCount >= 2) return line.split(",").map(v => v.trim());
    return [line.trim()];
  });

  return parseContactRows(rawRows);
}

function getDbAge(uploadDate: string): { label: string; color: string } {
  if (!uploadDate) return { label: "", color: "" };
  const now = new Date();
  const uploaded = new Date(uploadDate);
  const diffMs = now.getTime() - uploaded.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffDays < 30) return { label: "Nova", color: "bg-green/10 text-green border-green/20" };
  if (diffMonths < 6) return { label: `${diffMonths}m`, color: "bg-accent/10 text-accent border-accent/20" };
  if (diffYears < 1) return { label: `${diffMonths}m`, color: "bg-yellow/10 text-yellow border-yellow/20" };
  if (diffYears < 3) return { label: `${diffYears}r`, color: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
  return { label: `${diffYears}r`, color: "bg-red/10 text-red border-red/20" };
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<DatabaseRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedContact[]>([]);
  const [importName, setImportName] = useState("");
  const [importProject, setImportProject] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [dbContacts, setDbContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dRes, pRes] = await Promise.all([
        fetch("/api/databases"),
        fetch("/api/projects"),
      ]);
      if (!dRes.ok || !pRes.ok) throw new Error("Chyba nacitani");
      const dData = await dRes.json();
      const pData = await pRes.json();
      setDatabases(dData.databases || []);
      setProjects(pData.projects || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba nacitani");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (dbId: string) => {
    if (expandedDb === dbId) {
      setExpandedDb(null);
      setDbContacts([]);
      return;
    }
    setExpandedDb(dbId);
    setLoadingContacts(true);
    try {
      const res = await fetch(`/api/contacts?databaseId=${dbId}&limit=200`);
      if (!res.ok) throw new Error("Chyba nacitani kontaktu");
      const data = await res.json();
      setDbContacts(data.contacts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba nacitani kontaktu");
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportName(file.name.replace(/\.[^.]+$/, ""));
    const data = await file.arrayBuffer();
    const ext = file.name.toLowerCase().split(".").pop();
    let contacts: ParsedContact[];
    if (ext === "docx" || ext === "doc") {
      contacts = await smartParseDOCX(data);
    } else {
      contacts = smartParseXLSX(data);
    }
    setParsed(contacts);
    setImportStep("preview");
  };

  const doImport = async () => {
    setImportStep("importing");
    try {
      const valid = parsed.filter((c) => c.valid);

      const dbRes = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: importName,
          source: "xlsx",
          projectId: importProject || null,
          contactCount: valid.length,
        }),
      });
      if (!dbRes.ok) throw new Error("Chyba vytvareni databaze");
      const dbData = await dbRes.json();

      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: dbData.id,
          projectId: importProject || null,
          contacts: valid.map((c) => ({
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
            email: c.email,
            city: c.city,
            address: c.address,
            potentialValue: c.potentialValue,
            pipelineStage: c.pipelineStage || "novy",
            hotCold: c.hotCold || "warm",
            occupation: c.occupation,
            note: c.note,
          })),
        }),
      });
      if (!res.ok) throw new Error("Chyba importu kontaktu");
      const result = await res.json();
      setImportResult({ imported: result.imported || 0, errors: result.errors || 0 });
      setImportStep("done");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba importu");
      setImportStep("upload");
    }
  };

  const closeImport = () => {
    setShowImport(false);
    setImportStep("upload");
    setParsed([]);
    setImportName("");
    setImportProject("");
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const deleteDb = async (id: string) => {
    if (!confirm("Opravdu smazat tuto databazi? Kontakty zustanou v systemu.")) return;
    try {
      const res = await fetch(`/api/databases/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Chyba mazani"); }
      if (expandedDb === id) { setExpandedDb(null); setDbContacts([]); }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba mazani");
    }
  };

  const filtered = databases.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const validCount = parsed.filter((c) => c.valid).length;
  const skippedCount = parsed.length - validCount;
  const totalContacts = databases.reduce((s, d) => s + (d.contactCount || 0), 0);

  // Group by age
  const sortedDbs = [...filtered].sort((a, b) => {
    const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
    const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
    return dateB - dateA;
  });

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
          <h1 className="text-xl font-bold">Databaze</h1>
          <p className="text-xs text-txt3 mt-1">{databases.length} databazi &middot; {totalContacts} kontaktu celkem</p>
        </div>
        <button onClick={() => { setShowImport(true); setImportStep("upload"); }} className="btn-primary flex items-center gap-2 text-sm">
          <Upload size={16} /> Import XLSX
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat databaze..." className="w-full pl-10" />
      </div>

      {/* Database list */}
      <div className="space-y-3">
        {sortedDbs.map((db) => {
          const age = getDbAge(db.uploadDate);
          const isExpanded = expandedDb === db.id;

          return (
            <div key={db.id} className="glass rounded-2xl border border-border overflow-hidden transition-all">
              {/* Database header */}
              <div className="p-5 hover:bg-surface2/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Database size={18} className="text-accent" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm truncate">{db.name}</h3>
                        {age.label && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${age.color}`}>
                            {age.label}
                          </span>
                        )}
                        {!db.active && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-surface3 text-txt3">
                            Neaktivni
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-txt3">
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {db.contactCount} kontaktu
                        </span>
                        {db.projectName && (
                          <span className="text-accent">{db.projectName}</span>
                        )}
                        {db.uploadDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(db.uploadDate).toLocaleDateString("cs-CZ")}
                          </span>
                        )}
                        {db.agentName && (
                          <span>{db.agentName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={() => toggleExpand(db.id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                        isExpanded
                          ? "bg-accent/10 text-accent"
                          : "bg-surface2 text-txt3 hover:text-txt hover:bg-surface3"
                      }`}
                    >
                      <Eye size={13} />
                      {isExpanded ? "Skryt" : "Zobrazit"}
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button
                      onClick={() => deleteDb(db.id)}
                      className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-txt3 hover:text-red hover:bg-red/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded contacts */}
              {isExpanded && (
                <div className="border-t border-border">
                  {loadingContacts ? (
                    <div className="p-6 text-center">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : dbContacts.length === 0 ? (
                    <div className="p-6 text-center text-txt3 text-sm">
                      Zadne kontakty v teto databazi
                    </div>
                  ) : (
                    <>
                      {/* Stats row */}
                      <div className="px-5 py-3 bg-surface2/30 flex items-center gap-4 text-xs flex-wrap">
                        <span className="text-txt3">Celkem: <span className="text-txt font-bold">{dbContacts.length}</span></span>
                        {Object.entries(
                          dbContacts.reduce((acc, c) => {
                            const stage = c.pipelineStage || "novy";
                            acc[stage] = (acc[stage] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([stage, count]) => (
                          <span key={stage} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STAGE_COLORS[stage] || "bg-surface3 text-txt3"}`}>
                            {STAGE_LABELS[stage] || stage}: {count}
                          </span>
                        ))}
                        {(() => {
                          const hot = dbContacts.filter(c => c.hotCold === "hot").length;
                          const warm = dbContacts.filter(c => c.hotCold === "warm").length;
                          const cold = dbContacts.filter(c => c.hotCold === "cold").length;
                          return (
                            <>
                              {hot > 0 && <span className="text-red font-bold">HOT: {hot}</span>}
                              {warm > 0 && <span className="text-yellow font-bold">WARM: {warm}</span>}
                              {cold > 0 && <span className="text-blue-400 font-bold">COLD: {cold}</span>}
                            </>
                          );
                        })()}
                      </div>

                      {/* Contact table */}
                      <div className="max-h-[400px] overflow-y-auto">
                        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-2 px-5 py-2 text-[10px] font-semibold text-txt3 uppercase tracking-wider border-b border-border sticky top-0 bg-surface z-10">
                          <span>Jmeno</span><span>Telefon</span><span>Email</span><span>Mesto</span><span>Faze</span>
                        </div>
                        {dbContacts.map((c) => (
                          <div key={c.id} className="border-b border-border/30 hover:bg-surface2/30 transition-colors">
                            {/* Desktop row */}
                            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-2 px-5 py-2.5 text-sm">
                              <span className="truncate font-medium">{c.firstName} {c.lastName}</span>
                              <span className="truncate text-txt2 flex items-center gap-1">
                                {c.phone && <><Phone size={10} className="shrink-0" />{c.phone}</>}
                              </span>
                              <span className="truncate text-txt2 flex items-center gap-1">
                                {c.email && <><Mail size={10} className="shrink-0" />{c.email}</>}
                              </span>
                              <span className="truncate text-txt3 text-xs">{c.city}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${STAGE_COLORS[c.pipelineStage] || "bg-surface3 text-txt3"}`}>
                                {STAGE_LABELS[c.pipelineStage] || c.pipelineStage}
                              </span>
                            </div>
                            {/* Mobile row */}
                            <div className="md:hidden px-5 py-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{c.firstName} {c.lastName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_COLORS[c.pipelineStage] || "bg-surface3 text-txt3"}`}>
                                  {STAGE_LABELS[c.pipelineStage] || c.pipelineStage}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-txt3">
                                {c.phone && <span className="flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                                {c.city && <span>{c.city}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {dbContacts.length >= 200 && (
                        <div className="px-5 py-2 text-center text-[11px] text-txt3 bg-surface2/20">
                          Zobrazeno prvnich 200 kontaktu. Pro vsechny pouzijte filtr na strance Kontakty.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-2xl border border-border p-12 text-center">
          <Database size={32} className="mx-auto mb-3 text-txt3" />
          <p className="text-txt3 text-sm">Zadne databaze</p>
          <button onClick={() => { setShowImport(true); setImportStep("upload"); }} className="btn-primary mt-4 text-sm">Importovat prvni databazi</button>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold">Import kontaktu z XLSX</h3>
              <button onClick={closeImport} className="text-txt3 hover:text-txt"><X size={18} /></button>
            </div>

            {importStep === "upload" && (
              <div className="p-8">
                <div className="mb-4">
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Priradit k projektu</label>
                  <div className="relative">
                    <select value={importProject} onChange={(e) => setImportProject(e.target.value)} className="w-full appearance-none pr-8">
                      <option value="">Zadny projekt</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt3 pointer-events-none" />
                  </div>
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all"
                >
                  <Upload size={36} className="mx-auto mb-3 text-txt3" />
                  <p className="text-sm font-medium mb-1">Kliknete pro nahrani souboru</p>
                  <p className="text-xs text-txt3">Podporovane formaty: .xlsx, .xls, .docx</p>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.docx,.doc" onChange={handleFile} className="hidden" />
              </div>
            )}

            {importStep === "preview" && (
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-green">
                    <Check size={16} />
                    <span className="text-sm font-medium">{validCount} validnich kontaktu</span>
                  </div>
                  {skippedCount > 0 && (
                    <div className="flex items-center gap-2 text-yellow">
                      <AlertCircle size={16} />
                      <span className="text-sm">{skippedCount} preskoceno</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-semibold text-txt3 uppercase tracking-wider mb-1 block">Nazev databaze</label>
                  <input value={importName} onChange={(e) => setImportName(e.target.value)} className="w-full" />
                </div>

                <div className="bg-surface rounded-xl border border-border overflow-hidden max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-[1.5fr_1.2fr_1.5fr_1fr_0.8fr_0.5fr] gap-2 px-3 py-2 text-[10px] font-semibold text-txt3 border-b border-border sticky top-0 bg-surface z-10">
                    <span>Jmeno</span><span>Telefon</span><span>Email</span><span>Hodnota</span><span>Faze</span><span></span>
                  </div>
                  {parsed.slice(0, 100).map((c, i) => (
                    <div key={i} className={`grid grid-cols-[1.5fr_1.2fr_1.5fr_1fr_0.8fr_0.5fr] gap-2 px-3 py-2 text-xs border-b border-border/50 ${!c.valid ? "opacity-40" : ""}`}>
                      <span className="truncate">{c.firstName} {c.lastName}</span>
                      <span className="truncate text-txt2">{c.phone}</span>
                      <span className="truncate text-txt2">{c.email}</span>
                      <span className="truncate text-green font-mono text-[11px]">
                        {c.potentialValue > 0 ? `${c.potentialValue.toLocaleString("cs-CZ")} Kc` : ""}
                      </span>
                      <span className={`truncate text-[10px] font-bold ${c.pipelineStage ? "text-accent" : "text-txt3"}`}>
                        {STAGE_LABELS[c.pipelineStage] || ""}
                      </span>
                      <span className={`text-[10px] font-bold ${c.valid ? "text-green" : "text-red"}`}>{c.valid ? "OK" : "Skip"}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={closeImport} className="btn-ghost text-sm">Zrusit</button>
                  <button onClick={doImport} disabled={validCount === 0} className="btn-primary text-sm disabled:opacity-50">
                    Importovat {validCount} kontaktu
                  </button>
                </div>
              </div>
            )}

            {importStep === "importing" && (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-txt2">Importuji kontakty...</p>
              </div>
            )}

            {importStep === "done" && importResult && (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-green/10 flex items-center justify-center mx-auto mb-4">
                  <Check size={24} className="text-green" />
                </div>
                <h4 className="font-bold text-lg mb-2">Import dokoncen</h4>
                <p className="text-sm text-txt2 mb-1">Importovano: <span className="text-green font-bold">{importResult.imported}</span></p>
                {importResult.errors > 0 && (
                  <p className="text-sm text-txt2">Chyby: <span className="text-red font-bold">{importResult.errors}</span></p>
                )}
                <button onClick={closeImport} className="btn-primary mt-6 text-sm">Zavrit</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
