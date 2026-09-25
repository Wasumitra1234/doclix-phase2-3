/**
 * OCR service — integration-ready.
 * Provider: none | google-vision | aws-textract | tesseract (future)
 * Does NOT invent extraction rules; returns structured stub for wiring.
 */
import { env } from "../../config/env";

export interface OcrResult {
  provider: string;
  text: string;
  data: Record<string, unknown>;
  pageCount: number;
  confidence?: number;
}

export async function runOcr(opts: {
  buffer: Buffer;
  mimeType: string;
  purpose?: string;
}): Promise<OcrResult> {
  if (env.OCR_PROVIDER === "none" || !env.OCR_PROVIDER) {
    // Integration-ready stub: no fake legal data
    return {
      provider: "none",
      text: "",
      data: {
        status: "not_configured",
        message:
          "OCR provider not configured. Set OCR_PROVIDER and credentials to enable extraction.",
        purpose: opts.purpose || null,
      },
      pageCount: 1,
    };
  }

  // Future: Google Vision / Textract / custom
  throw new Error(`OCR provider "${env.OCR_PROVIDER}" not implemented in this build`);
}
