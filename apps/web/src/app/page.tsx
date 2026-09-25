"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("doclix_token");
    if (token) router.replace("/dashboard");
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col px-5 py-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
            D
          </div>
          <span className="font-semibold text-slate-900 tracking-tight">Doclix</span>
        </div>
        <Link href="/login" className="btn-pill bg-blue-600 text-white text-xs px-4">
          Get Started
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-8">
        <div className="text-center space-y-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white/80 border border-slate-200 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            No laptop needed
          </p>
          <h1 className="text-[28px] font-bold text-slate-900 leading-tight tracking-tight">
            Legal documents,
            <br />
            <span className="text-slate-500">from your phone</span>
          </h1>
          <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
            Affidavits, POA, rental & sale agreements — fill, preview & download A4 PDFs.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {["Affidavit", "POA", "Rental", "Sale Deed", "Bond"].map((t) => (
            <span
              key={t}
              className="text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-full px-3 py-1.5"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <Link href="/register" className="btn-primary block text-center">
            Create free account
          </Link>
          <Link href="/login" className="btn-ghost block text-center">
            Login
          </Link>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-8">
        Mobile-first · Cloud-hosted · Phase 2
      </p>
    </main>
  );
}
