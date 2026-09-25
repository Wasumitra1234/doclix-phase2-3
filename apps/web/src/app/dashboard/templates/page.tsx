"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { templatesApi, documentsApi } from "@/lib/api";

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    templatesApi
      .list(search ? { search } : undefined)
      .then((r) => setTemplates(r.templates))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const id = searchParams.get("create");
    if (id && !creating) handleCreate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleCreate(templateId: string) {
    setCreating(templateId);
    try {
      const { document } = await documentsApi.create({ templateId });
      router.push(`/dashboard/documents/${document.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to create");
      setCreating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Create document</h2>
        <p className="text-sm text-slate-500 mt-0.5">Choose a template to start</p>
      </div>

      <input
        className="input"
        placeholder="Search templates…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center text-sm text-slate-400 py-12">No templates found</div>
      ) : (
        <ul className="space-y-2.5">
          {templates.map((t) => (
            <li key={t.id} className="card !p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 text-lg">
                  📄
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm leading-snug">{t.name}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t.category} · {t.state} · {t.language}
                  </p>
                  {t.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                  <button
                    className="btn-primary !w-auto !min-h-[40px] !py-2 !px-4 text-sm mt-3"
                    disabled={creating === t.id}
                    onClick={() => handleCreate(t.id)}
                  >
                    {creating === t.id ? "Creating…" : "Use template"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
