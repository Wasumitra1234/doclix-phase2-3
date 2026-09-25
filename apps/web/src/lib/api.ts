const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("doclix_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("doclix_token", token);
  else localStorage.removeItem("doclix_token");
}

export async function api<T = any>(
  path: string,
  opts: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
  });

  // Binary download
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/pdf")) {
    if (!res.ok) throw new Error("Download failed");
    return (await res.blob()) as any;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || "Request failed") as any;
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data as T;
}

export const authApi = {
  register: (body: {
    tenantName: string;
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
  }) => api<{ token: string; user: any }>("/api/auth/register", { method: "POST", json: body }),
  login: (body: { email: string; password: string }) =>
    api<{ token: string; user: any }>("/api/auth/login", { method: "POST", json: body }),
  me: () => api<any>("/api/auth/me"),
};

export const templatesApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ templates: any[] }>(`/api/templates${q}`);
  },
  get: (id: string) => api<{ template: any }>(`/api/templates/${id}`),
};

export const documentsApi = {
  list: () => api<{ documents: any[] }>("/api/documents"),
  get: (id: string) => api<{ document: any }>(`/api/documents/${id}`),
  create: (body: { templateId: string; title?: string; formData?: Record<string, unknown> }) =>
    api<{ document: any }>("/api/documents", { method: "POST", json: body }),
  update: (id: string, body: { title?: string; formData?: Record<string, unknown> }) =>
    api<{ document: any }>(`/api/documents/${id}`, { method: "PATCH", json: body }),
  remove: (id: string) => api(`/api/documents/${id}`, { method: "DELETE" }),
  generatePdf: (id: string) =>
    api<{
      generatedFileId: string;
      fileName: string;
      sizeBytes: number;
      downloadUrl: string;
    }>(`/api/documents/${id}/generate-pdf`, { method: "POST" }),
  downloadPdf: async (docId: string, fileId: string, fileName: string) => {
    const token = getToken();
    const res = await fetch(
      `${API_BASE}/api/documents/${docId}/files/${fileId}/download`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "document.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // Android share if available
    if (navigator.share && blob) {
      try {
        const file = new File([blob], fileName || "document.pdf", {
          type: "application/pdf",
        });
        if (navigator.canShare?.({ files: [file] })) {
          // optional — user can share from download sheet
        }
      } catch {
        /* ignore */
      }
    }
    return blob;
  },
};

export const uploadsApi = {
  upload: async (file: File, opts?: { purpose?: string; documentId?: string; ocr?: boolean }) => {
    const fd = new FormData();
    fd.append("file", file);
    if (opts?.purpose) fd.append("purpose", opts.purpose);
    if (opts?.documentId) fd.append("documentId", opts.documentId);
    if (opts?.ocr) fd.append("ocr", "true");
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data as { upload: any };
  },
  list: (documentId?: string) => {
    const q = documentId ? `?documentId=${documentId}` : "";
    return api<{ uploads: any[] }>(`/api/uploads${q}`);
  },
};

export const subscriptionsApi = {
  plans: () => api<{ plans: any[] }>("/api/subscriptions/plans"),
  current: () => api<{ subscription: any }>("/api/subscriptions/current"),
  createOrder: (planId: string) =>
    api<{ order: any; keyId: string; plan: any }>("/api/subscriptions/create-order", {
      method: "POST",
      json: { planId },
    }),
  verify: (body: { orderId: string; paymentId: string; signature: string; planId: string }) =>
    api("/api/subscriptions/verify", { method: "POST", json: body }),
};
