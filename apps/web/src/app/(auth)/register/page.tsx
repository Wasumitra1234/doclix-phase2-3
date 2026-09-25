"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tenantName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.register({
        tenantName: form.tenantName,
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      setToken(data.token);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 flex flex-col">
      <Link href="/" className="text-sm text-slate-500 mb-6 inline-flex">
        ← Back
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
        <p className="text-sm text-slate-500 mt-1">14-day free trial · works on phone</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 flex-1 pb-8">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}
        <div>
          <label className="label">Firm / Chambers name</label>
          <input
            className="input"
            value={form.tenantName}
            onChange={(e) => set("tenantName", e.target.value)}
            required
            placeholder="e.g. Sharma Legal Chambers"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <input
              className="input"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Last name</label>
            <input
              className="input"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            inputMode="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Phone (optional)</label>
          <input
            className="input"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+91…"
          />
        </div>
        <div>
          <label className="label">Password (min 8)</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            minLength={8}
          />
        </div>
        <button type="submit" className="btn-primary mt-3" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Already have account?{" "}
        <Link href="/login" className="text-slate-900 font-semibold">
          Login
        </Link>
      </p>
    </main>
  );
}
