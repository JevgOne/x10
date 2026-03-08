"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Briefcase, Phone, FolderOpen,
  Database, Target, Settings, LogOut, ChevronLeft, Menu,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Kontakty", icon: Users },
  { href: "/databases", label: "Databáze", icon: Database },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/projects", label: "Projekty", icon: Briefcase },
  { href: "/calls", label: "Hovory", icon: Phone },
  { href: "/documents", label: "Dokumenty", icon: FolderOpen },
  { href: "/settings", label: "Nastavení", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/");
        else setUser(d.user);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-txt3">Načítání...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-56"
        } bg-surface border-r border-border flex flex-col transition-all duration-200 flex-shrink-0`}
      >
        <div className="p-4 flex items-center justify-between border-b border-border">
          {!collapsed && <span className="font-bold text-sm text-accent">CallFlow CRM</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-txt3 hover:text-txt">
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-txt2 hover:text-txt hover:bg-surface2"
                }`}
              >
                <item.icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          {!collapsed && (
            <div className="mb-2 px-2">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-txt3 truncate">{user.role}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-txt3 hover:text-red hover:bg-red/5 w-full transition-colors"
          >
            <LogOut size={18} />
            {!collapsed && <span>Odhlásit</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
