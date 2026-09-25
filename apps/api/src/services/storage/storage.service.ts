import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "../../config/env";

export interface StoredObject {
  storageProvider: string;
  bucket: string | null;
  objectKey: string;
  sizeBytes: number;
  checksum: string;
}

function checksum(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Store file buffer. Local for dev; S3/R2 interface ready for production. */
export async function storeFile(opts: {
  tenantId: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
}): Promise<StoredObject> {
  const ext = path.extname(opts.originalName) || "";
  const hash = crypto.randomBytes(8).toString("hex");
  const folder = opts.folder || "uploads";
  const objectKey = `${opts.tenantId}/${folder}/${Date.now()}-${hash}${ext}`;
  const sum = checksum(opts.buffer);

  if (env.STORAGE_PROVIDER === "local") {
    const base = path.resolve(env.STORAGE_LOCAL_PATH);
    const full = path.join(base, objectKey);
    await ensureDir(path.dirname(full));
    await fs.writeFile(full, opts.buffer);
    return {
      storageProvider: "local",
      bucket: null,
      objectKey,
      sizeBytes: opts.buffer.length,
      checksum: sum,
    };
  }

  // S3 / R2: production uses AWS SDK or fetch to R2.
  // Interface is ready — wire AWS SDK when credentials are set.
  if (!env.S3_BUCKET || !env.AWS_ACCESS_KEY_ID) {
    // Fallback to local so app never breaks in partial config
    const base = path.resolve(env.STORAGE_LOCAL_PATH);
    const full = path.join(base, objectKey);
    await ensureDir(path.dirname(full));
    await fs.writeFile(full, opts.buffer);
    return {
      storageProvider: "local",
      bucket: null,
      objectKey,
      sizeBytes: opts.buffer.length,
      checksum: sum,
    };
  }

  // Placeholder for SDK putObject — implement with @aws-sdk/client-s3 when deploying to R2/S3
  throw new Error(
    `Cloud storage (${env.STORAGE_PROVIDER}) configured but SDK put not wired in this build. Use STORAGE_PROVIDER=local or add @aws-sdk/client-s3.`
  );
}

export async function readFile(objectKey: string, storageProvider = "local"): Promise<Buffer> {
  if (storageProvider === "local" || !storageProvider) {
    const full = path.join(path.resolve(env.STORAGE_LOCAL_PATH), objectKey);
    return fs.readFile(full);
  }
  throw new Error("Cloud read not wired — use local or add S3 SDK");
}

export function publicUrl(objectKey: string, storageProvider = "local"): string | null {
  if (storageProvider === "local") {
    return `/files/${objectKey}`;
  }
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`;
  }
  return null;
}
