"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setToken(data.token);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 flex flex-col">
      <Link href="/" className="text-sm text-slate-500 mb-8 inline-flex items-center gap-1">
        ← Back
      </Link>

      <div className="mb-8">
        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-bold mb-4">
          D
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Login to continue on Doclix</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 flex-1">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-8">
        No account?{" "}
        <Link href="/register" className="text-slate-900 font-semibold">
          Register
        </Link>
      </p>
    </main>
  );
}
