"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, X } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K to open + custom event from header button
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const openHandler = () => setOpen(true);

    window.addEventListener("keydown", keyHandler);
    window.addEventListener("open-search", openHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("open-search", openHandler);
    };
  }, []);

  // Focus input when open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search contacts
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const doSearch = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(query)}&limit=10`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(
            (data.contacts || []).map((c: Record<string, string>) => ({
              id: c.id,
              title: `${c.firstName} ${c.lastName || ""}`.trim(),
              subtitle: [c.phone, c.email, c.city].filter(Boolean).join(" · "),
              href: `/contacts/${c.id}`,
            }))
          );
        }
      } catch {
        /* abort */
      }
      setLoading(false);
    };

    const t = setTimeout(doSearch, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  // Keyboard navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[selectedIdx]) {
      router.push(results[selectedIdx].href);
      setOpen(false);
    }
  };

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg mx-4 glass rounded-2xl border border-border overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search size={18} className="text-txt3 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKey}
            placeholder="Hledat kontakty..."
            className="flex-1 bg-transparent border-none outline-none text-sm p-0 shadow-none"
            style={{ boxShadow: "none" }}
          />
          <button onClick={() => setOpen(false)} className="text-txt3 hover:text-txt">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-8 text-center text-sm text-txt3">Žádné výsledky</div>
          )}

          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => navigate(r.href)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                i === selectedIdx ? "bg-accent/10" : "hover:bg-surface2/50"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Users size={14} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{r.title}</div>
                {r.subtitle && (
                  <div className="text-xs text-txt3 truncate">{r.subtitle}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {!query && (
          <div className="p-6 text-center">
            <p className="text-xs text-txt3 mb-2">
              Začněte psát pro vyhledávání kontaktů
            </p>
            <div className="flex items-center justify-center gap-2 text-[10px] text-txt3">
              <kbd className="bg-surface2 px-1.5 py-0.5 rounded border border-border">↑↓</kbd>
              <span>navigace</span>
              <kbd className="bg-surface2 px-1.5 py-0.5 rounded border border-border">Enter</kbd>
              <span>otevřít</span>
              <kbd className="bg-surface2 px-1.5 py-0.5 rounded border border-border">Esc</kbd>
              <span>zavřít</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
