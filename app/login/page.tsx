"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const FEATURES = [
  { icon: "📋", title: "Track every application", desc: "Never lose track of where you applied or what stage you're in." },
  { icon: "✨", title: "AI resume tailoring", desc: "Paste a job description and get a resume tuned for that exact role." },
  { icon: "✉️", title: "Cover letters in seconds", desc: "Compelling, personalised cover letters generated instantly." },
];

function GenovaLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "w-12 h-12 text-2xl rounded-2xl" : size === "sm" ? "w-8 h-8 text-base rounded-xl" : "w-10 h-10 text-xl rounded-xl";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  return (
    <div className="flex items-center gap-3">
      <div className={`${box} bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0`}>
        G
      </div>
      <span className={`${text} font-bold tracking-tight`}>Genova</span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", { username, password, redirect: false });
    if (result?.error) {
      setError("Invalid username or password");
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Brand panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex-col justify-between p-14 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="text-white">
            <GenovaLogo size="md" />
          </div>

          {/* Hero text */}
          <div className="mt-20">
            <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
              Apply smarter.<br />
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Land faster.
              </span>
            </h1>
            <p className="text-slate-400 mt-5 text-lg leading-relaxed max-w-md">
              Your AI-powered job search command center. Stay organised, tailor every application, and give yourself the best shot at every role.
            </p>
          </div>

          {/* Features */}
          <div className="mt-14 space-y-6">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{f.title}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="relative z-10 text-slate-600 text-xs">
          © {new Date().getFullYear()} Genova. Built for serious job seekers.
        </p>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-gray-900">
            <GenovaLogo size="md" />
            <p className="text-gray-500 text-sm mt-3">Apply smarter. Land faster.</p>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-gray-500 text-sm mt-1 mb-8">
            {mode === "login"
              ? "Sign in to your Genova account"
              : "Join Genova and take control of your job search"}
          </p>

          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            {(["login", "register"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. johndoe"
                required
                autoFocus
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm bg-gray-50"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span className="shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-2.5 rounded-xl hover:from-blue-700 hover:to-violet-700 font-semibold text-sm disabled:opacity-50 transition-all shadow-sm mt-2"
            >
              {loading
                ? (mode === "login" ? "Signing in..." : "Creating account...")
                : (mode === "login" ? "Sign In" : "Create Account")}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            {mode === "login" ? "New to Genova? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-blue-600 hover:underline font-medium"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

    </div>
  );
}
