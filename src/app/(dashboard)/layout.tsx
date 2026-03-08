"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Briefcase, Phone, FolderOpen,
  Database, Target, Settings, LogOut, ChevronLeft, Menu,
  UserCog, Bell,
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
];

const ADMIN_NAV = [
  { href: "/settings", label: "Uživatelé & Nastavení", icon: UserCog },
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-txt3 text-sm">Načítání...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const allNav = [...NAV, ...(user.role === "admin" ? ADMIN_NAV : [])];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-[68px]" : "w-[240px]"
        } bg-surface flex flex-col transition-all duration-300 flex-shrink-0 border-r border-border`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-border ${collapsed ? "justify-center px-2" : "px-5"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center">
                <Phone size={14} className="text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight">CallFlow</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`text-txt3 hover:text-txt transition-colors ${collapsed ? "" : "ml-auto"}`}
          >
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 space-y-0.5">
          {!collapsed && <div className="text-[10px] font-semibold text-txt3 uppercase tracking-widest px-3 py-2">Menu</div>}
          {allNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                  active
                    ? "bg-accent/10 text-accent font-medium shadow-[inset_0_0_0_1px_rgba(59,125,255,0.15)]"
                    : "text-txt2 hover:text-txt hover:bg-surface2"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <item.icon size={18} className={active ? "text-accent" : ""} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          {!collapsed && (
            <div className="mb-3 px-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 flex items-center justify-center text-xs font-bold text-accent">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-[10px] text-txt3 uppercase tracking-wider">{user.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-txt3 hover:text-red hover:bg-red/5 w-full transition-all ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={16} />
            {!collapsed && <span>Odhlásit</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface/50 backdrop-blur-xl flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold capitalize">
              {pathname.replace("/", "").replace(/-/g, " ") || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl bg-surface2 flex items-center justify-center text-txt3 hover:text-txt transition-colors relative">
              <Bell size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red rounded-full" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 grid-pattern">
          <div className="animate-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
