"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Chyba přihlášení");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Chyba připojení k serveru");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[380px] animate-in relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent2 mb-5 glow-accent">
            <Phone className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">CallFlow</h1>
          <p className="text-txt3 text-sm mt-2">Investment CRM Platform</p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-7">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-txt3 mb-1.5 block uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  className="w-full pl-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-txt3 mb-1.5 block uppercase tracking-wider">Heslo</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red text-sm bg-red/10 rounded-xl px-4 py-2.5 border border-red/20">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <span>Přihlašování...</span>
              ) : (
                <>
                  <span>Přihlásit se</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-txt3 mt-6 opacity-50">
          CallFlow CRM v1.0
        </p>
      </div>
    </div>
  );
}
