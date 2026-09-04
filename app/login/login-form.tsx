"use client";
import { useState } from "react";
import { Briefcase, Eye, EyeOff, Lock, Mail, Users } from "lucide-react";
import { signInWithPassword } from "./actions";

function BrandingPanel() {
  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#2c4a6e] px-14 py-12 text-white md:flex">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(120,160,200,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(40,70,110,0.55), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
            <span style={{ color: "var(--ink)", fontSize: 18, fontWeight: 500 }}>E</span>
          </div>
          <span className="font-sans text-2xl tracking-tight text-white" style={{ fontWeight: 300 }}>
            Epic AI Products
          </span>
        </div>
      </div>

      <div className="relative z-10">
        <h1 className="mb-6 text-5xl leading-tight tracking-tight" style={{ fontWeight: 300, color: "#fff" }}>
          Lead assignment.
          <span className="mt-2 block">Clear ownership.</span>
        </h1>
        <p className="max-w-md text-xs leading-relaxed text-white/70">
          The console for operators who assign audiences and the clients who receive them.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-3 text-[13px] text-white/40">
        <Users size={20} strokeWidth={1.5} />
        <span>Operators</span>
        <span className="mx-1">·</span>
        <Briefcase size={20} strokeWidth={1.5} />
        <span>Clients</span>
      </div>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="mb-6 flex items-center justify-center gap-2 md:hidden">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--ink)" }}>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 500 }}>E</span>
      </div>
      <span className="text-2xl tracking-tight" style={{ color: "var(--ink)", fontWeight: 300 }}>
        Epic AI Products
      </span>
    </div>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function signIn(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    const result = await signInWithPassword(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    window.location.assign(result.href);
  }

  return (
    <div className="flex min-h-screen">
      <BrandingPanel />

      <div
        className="flex w-full flex-col items-center justify-center px-4 py-12 md:w-1/2"
        style={{ background: "var(--parchment)" }}
      >
        <div className="w-full max-w-[420px]">
          <MobileLogo />

          <div className="card" style={{ padding: 24 }}>
            {error && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(192,57,43,0.08)",
                  color: "var(--cinnabar)",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={signIn}>
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="email" style={{ display: "block", marginBottom: 8 }}>
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={20}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                    style={{ color: "var(--ash)" }}
                    aria-hidden
                  />
                  <input
                    id="email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: 40 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="label" htmlFor="password" style={{ display: "block", marginBottom: 8 }}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={20}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                    style={{ color: "var(--ash)" }}
                    aria-hidden
                  />
                  <input
                    id="password"
                    className="input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute top-1/2 right-3 -translate-y-1/2"
                    style={{ color: "var(--ash)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <button className="btn" style={{ width: "100%" }} type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p style={{ textAlign: "center", color: "var(--ash)", fontSize: 13, marginTop: 24 }}>
            Access is limited to Epic AI Products operators and clients.
          </p>
          <p style={{ textAlign: "center", color: "var(--ash)", fontSize: 12, marginTop: 32, opacity: 0.7 }}>
            © {new Date().getFullYear()} Epic AI Products. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
