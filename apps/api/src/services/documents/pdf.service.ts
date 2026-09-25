import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma";
import { storeFile } from "../storage/storage.service";

/** Strip simple HTML tags for PDF text layer */
function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fillPlaceholders(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = data[key];
    if (v === undefined || v === null || v === "") return "____________";
    return String(v);
  });
}

export async function generatePdfForDocument(opts: {
  documentId: string;
  tenantId: string;
  userId: string;
}): Promise<{
  generatedFileId: string;
  objectKey: string;
  sizeBytes: number;
  fileName: string;
}> {
  const doc = await prisma.savedDocument.findFirst({
    where: {
      id: opts.documentId,
      tenantId: opts.tenantId,
      deletedAt: null,
    },
    include: {
      templateVersion: true,
      template: true,
    },
  });

  if (!doc || !doc.templateVersion) {
    throw Object.assign(new Error("Document not found"), { status: 404 });
  }

  // Usage limit check
  const sub = await prisma.subscription.findFirst({
    where: {
      tenantId: opts.tenantId,
      status: { in: ["TRIALING", "ACTIVE"] },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (sub && sub.plan.documentsLimit !== -1) {
    const used = await prisma.usageLedger.aggregate({
      where: {
        tenantId: opts.tenantId,
        metric: "DOCUMENTS_GENERATED",
        periodStart: { lte: sub.currentPeriodEnd },
        periodEnd: { gte: sub.currentPeriodStart },
      },
      _sum: { quantity: true },
    });
    if ((used._sum.quantity || 0) >= sub.plan.documentsLimit) {
      throw Object.assign(new Error("Document generation limit reached for this billing period"), {
        status: 402,
      });
    }
  }

  const tv = doc.templateVersion;
  const formData = (doc.formData || {}) as Record<string, unknown>;
  const filled = fillPlaceholders(tv.bodyContent, formData);
  const plain = htmlToPlain(filled);

  const marginLeft = (tv.marginLeftMm || 20) * 2.834; // mm to pt approx
  const marginRight = (tv.marginRightMm || 20) * 2.834;
  const marginTop =
    ((tv.stampPaperTopClearanceMm || 40) + (tv.marginTopMm || 20)) * 2.834 * 0.5;
  const marginBottom = (tv.marginBottomMm || 20) * 2.834;
  const fontSize = tv.defaultFontSizePt || 12;

  const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const pdf = new PDFDocument({
      size: "A4",
      margins: {
        top: marginTop,
        bottom: marginBottom,
        left: marginLeft,
        right: marginRight,
      },
      info: {
        Title: doc.title,
        Author: "Doclix",
        Subject: doc.template?.name || "Legal Document",
      },
    });
    pdf.on("data", (c) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.font("Times-Roman").fontSize(fontSize);
    // Title
    pdf.font("Times-Bold").fontSize(fontSize + 2).text(doc.title, { align: "center" });
    pdf.moveDown(1);
    pdf.font("Times-Roman").fontSize(fontSize);

    // Body — preserve paragraphs
    const paragraphs = plain.split(/\n\n+/);
    for (const para of paragraphs) {
      pdf.text(para.trim(), { align: "left", lineGap: 3 });
      pdf.moveDown(0.6);
    }

    if (tv.footerContent) {
      pdf.moveDown(2);
      pdf.fontSize(9).fillColor("#666").text(tv.footerContent.replace(/\{\{[^}]+\}\}/g, ""), {
        align: "center",
      });
    }

    pdf.end();
  });

  const fileName = `${doc.title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 60) || "document"}.pdf`;
  const stored = await storeFile({
    tenantId: opts.tenantId,
    buffer: pdfBuffer,
    originalName: fileName,
    mimeType: "application/pdf",
    folder: "generated",
  });

  const generated = await prisma.generatedFile.create({
    data: {
      tenantId: opts.tenantId,
      documentId: doc.id,
      userId: opts.userId,
      storageProvider: stored.storageProvider,
      bucket: stored.bucket,
      objectKey: stored.objectKey,
      fileName,
      mimeType: "application/pdf",
      sizeBytes: stored.sizeBytes,
      checksum: stored.checksum,
      templateVersionId: tv.id,
      isFinal: true,
    },
  });

  await prisma.savedDocument.update({
    where: { id: doc.id },
    data: { status: "GENERATED", finalizedAt: new Date() },
  });

  const periodStart = sub?.currentPeriodStart || new Date();
  const periodEnd = sub?.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);

  await prisma.usageLedger.create({
    data: {
      tenantId: opts.tenantId,
      subscriptionId: sub?.id,
      userId: opts.userId,
      metric: "DOCUMENTS_GENERATED",
      quantity: 1,
      unit: "count",
      referenceType: "SavedDocument",
      referenceId: doc.id,
      periodStart,
      periodEnd,
    },
  });

  await prisma.documentLog.create({
    data: {
      tenantId: opts.tenantId,
      documentId: doc.id,
      userId: opts.userId,
      action: "GENERATED",
      details: { generatedFileId: generated.id, sizeBytes: stored.sizeBytes },
    },
  });

  return {
    generatedFileId: generated.id,
    objectKey: stored.objectKey,
    sizeBytes: stored.sizeBytes,
    fileName,
  };
}
