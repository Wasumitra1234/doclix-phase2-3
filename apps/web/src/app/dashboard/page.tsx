"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { documentsApi, templatesApi } from "@/lib/api";

export default function DashboardHome() {
  const [docs, setDocs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([documentsApi.list(), templatesApi.list()])
      .then(([d, t]) => {
        setDocs(d.documents.slice(0, 5));
        setTemplates(t.templates.slice(0, 4));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-7">
      {/* Hero CTA */}
      <section className="card !p-5 text-center space-y-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quick start</p>
        <h2 className="text-lg font-bold tracking-tight">Create a legal document</h2>
        <p className="text-sm text-slate-500">Pick a template · fill fields · preview · save</p>
        <Link href="/dashboard/templates" className="btn-primary !mt-2">
          + New document
        </Link>
      </section>

      {/* Templates grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[15px]">Templates</h3>
          <Link href="/dashboard/templates" className="text-xs font-medium text-blue-600">
            See all
          </Link>
        </div>
        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/templates?create=${t.id}`}
                className="card active:scale-[0.98] transition !p-3.5"
              >
                <p className="font-semibold text-sm line-clamp-2 leading-snug">{t.name}</p>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {t.category || t.state}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent docs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[15px]">Recent</h3>
          <Link href="/dashboard/documents" className="text-xs font-medium text-blue-600">
            See all
          </Link>
        </div>
        {loading ? null : docs.length === 0 ? (
          <div className="card text-center text-sm text-slate-400 py-10">
            No documents yet
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/documents/${d.id}`}
                  className="card !py-3.5 flex items-center justify-between gap-3 active:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{d.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {d.template?.name}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-1 rounded-full shrink-0">
                    {d.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
