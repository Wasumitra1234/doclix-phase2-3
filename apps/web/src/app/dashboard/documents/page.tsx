"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { documentsApi } from "@/lib/api";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentsApi
      .list()
      .then((r) => setDocs(r.documents))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My documents</h2>
        <Link href="/dashboard/templates" className="text-sm text-brand-600 font-medium">
          + New
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="card text-center text-sm text-slate-500 py-10">
          <p>No documents yet</p>
          <Link href="/dashboard/templates" className="btn-primary mt-4 inline-flex !w-auto">
            Choose template
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id}>
              <Link href={`/dashboard/documents/${d.id}`} className="card block active:bg-slate-50">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{d.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {d.template?.name} · {new Date(d.updatedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full h-fit shrink-0">
                    {d.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
