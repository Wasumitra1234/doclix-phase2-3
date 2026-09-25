"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { documentsApi, uploadsApi } from "@/lib/api";

export default function DocumentEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileRef = useRef<HTMLInputElement>(null);

  const [doc, setDoc] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [showForm, setShowForm] = useState(true);
  const [lastFile, setLastFile] = useState<{ id: string; name: string } | null>(null);
  const [uploads, setUploads] = useState<any[]>([]);

  const reload = useCallback(() => {
    return documentsApi.get(id).then((r) => {
      setDoc(r.document);
      setFormData(r.document.formData || {});
      setTitle(r.document.title || "");
      if (r.document.generatedFiles?.length) {
        const f = r.document.generatedFiles[0];
        setLastFile({ id: f.id, name: f.fileName });
      }
    });
  }, [id]);

  useEffect(() => {
    reload()
      .catch(() => router.replace("/dashboard/documents"))
      .finally(() => setLoading(false));
    uploadsApi.list(id).then((r) => setUploads(r.uploads)).catch(() => {});
  }, [id, router, reload]);

  const schema = doc?.templateVersion?.formSchema?.jsonSchema;
  const properties = schema?.properties || {};
  const required: string[] = schema?.required || [];
  const bodyContent: string = doc?.templateVersion?.bodyContent || "";

  const setField = useCallback((key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  function filledPreview(): string {
    let html = bodyContent;
    Object.entries(formData).forEach(([k, v]) => {
      const re = new RegExp(`\\{\\{${k}\\}\\}`, "g");
      html = html.replace(
        re,
        v ? String(v) : `<span style="background:#fef3c7;padding:0 2px">[${k}]</span>`
      );
    });
    html = html.replace(
      /\{\{(\w+)\}\}/g,
      '<span style="background:#fef3c7;padding:0 2px">[$1]</span>'
    );
    return html;
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await documentsApi.update(id, { title, formData });
      await reload();
      setMessage("Saved");
      setTimeout(() => setMessage(""), 2000);
    } catch (err: any) {
      setMessage(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function generatePdf() {
    setGenerating(true);
    setMessage("");
    try {
      await documentsApi.update(id, { title, formData });
      const result = await documentsApi.generatePdf(id);
      setLastFile({ id: result.generatedFileId, name: result.fileName });
      setMessage("PDF ready");
      await reload();
      // Auto-download on mobile
      await documentsApi.downloadPdf(id, result.generatedFileId, result.fileName);
    } catch (err: any) {
      setMessage(err.message || "PDF generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const { upload } = await uploadsApi.upload(file, {
        purpose: "other",
        documentId: id,
        ocr: true,
      });
      setUploads((u) => [upload, ...u]);
      setMessage(`Uploaded: ${file.name}`);
      // If OCR returns structured fields later, merge into formData
      if (upload.ocrData && typeof upload.ocrData === "object") {
        /* ready for field mapping in future */
      }
    } catch (err: any) {
      setMessage(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  if (!doc) return null;

  return (
    <div className="space-y-4 pb-36">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/documents" className="text-sm text-slate-500">
          ← Back
        </Link>
        {message && (
          <span className="ml-auto text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {message}
          </span>
        )}
      </div>

      <input
        className="input !text-base !font-semibold"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
      />

      <div className="status-block">
        <div className="status-header">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Template</span>
          <span className="text-slate-400 font-normal ml-auto text-xs">
            {doc.template?.name} · v{doc.templateVersion?.version}
          </span>
        </div>
      </div>

      {/* Upload from camera / gallery */}
      <div className="status-block">
        <div className="status-header">
          <span>Attachments</span>
          <span className="text-xs text-slate-400 ml-auto">{uploads.length} files</span>
        </div>
        <div className="px-4 pb-4 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={onFilePick}
          />
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "📷 Camera / Gallery upload"}
          </button>
          {uploads.slice(0, 3).map((u) => (
            <p key={u.id} className="text-xs text-slate-500 truncate">
              {u.originalName} · {(u.sizeBytes / 1024).toFixed(0)} KB
            </p>
          ))}
        </div>
      </div>

      {/* Form fields */}
      <div className="status-block">
        <button
          type="button"
          className="status-header w-full text-left"
          onClick={() => setShowForm((s) => !s)}
        >
          <svg
            className={`w-4 h-4 text-slate-400 transition ${showForm ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span>Form fields</span>
          <span className="text-xs text-slate-400 font-normal ml-auto">
            {Object.keys(properties).length} fields
          </span>
        </button>
        {showForm && (
          <div className="status-body space-y-3 pt-3">
            {Object.entries(properties).map(([key, prop]: [string, any]) => {
              const isReq = required.includes(key);
              const type = prop.type || "string";
              const isTextarea =
                key.includes("address") ||
                key.includes("description") ||
                key.includes("statement") ||
                key.includes("terms") ||
                key.includes("power");
              return (
                <div key={key}>
                  <label className="label">
                    {prop.title || key}
                    {isReq && <span className="text-red-500"> *</span>}
                  </label>
                  {type === "integer" || type === "number" ? (
                    <input
                      className="input"
                      type="number"
                      value={formData[key] ?? ""}
                      onChange={(e) =>
                        setField(key, e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  ) : prop.format === "date" ? (
                    <input
                      className="input"
                      type="date"
                      value={formData[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  ) : isTextarea ? (
                    <textarea
                      className="textarea"
                      rows={3}
                      value={formData[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="input"
                      type="text"
                      value={formData[key] ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="status-block">
        <button
          type="button"
          className="status-header w-full text-left"
          onClick={() => setShowPreview((s) => !s)}
        >
          <svg
            className={`w-4 h-4 text-slate-400 transition ${showPreview ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span>Preview</span>
          <span className="text-xs text-slate-400 font-normal ml-auto">A4 live</span>
        </button>
        {showPreview && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-3">
            <div className="preview-card">
              <div
                className="preview-page"
                dangerouslySetInnerHTML={{ __html: filledPreview() }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sticky actions */}
      <div
        className="fixed bottom-16 left-0 right-0 z-30 px-4 pointer-events-none"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="max-w-lg mx-auto pointer-events-auto space-y-2">
          <button className="btn-primary shadow-lg" onClick={generatePdf} disabled={generating}>
            {generating ? "Generating PDF…" : "📄 Generate & Download PDF"}
          </button>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            {lastFile && (
              <button
                className="btn-ghost flex-1"
                onClick={() => documentsApi.downloadPdf(id, lastFile.id, lastFile.name)}
              >
                Download again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
