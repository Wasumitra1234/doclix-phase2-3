import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateBody } from "../../utils/validate";
import { requireAuth } from "../../middleware/auth";
import * as documentsService from "../../services/documents/documents.service";
import { generatePdfForDocument } from "../../services/documents/pdf.service";
import { readFile } from "../../services/storage/storage.service";
import { prisma } from "../../config/prisma";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().max(200).optional(),
  formData: z.record(z.unknown()).optional(),
  state: z.string().optional(),
  language: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().max(200).optional(),
  formData: z.record(z.unknown()).optional(),
  status: z.enum(["DRAFT", "GENERATED", "FINALIZED", "ARCHIVED"]).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const docs = await documentsService.listDocuments(
      req.user!.tenantId,
      req.user!.id,
      { status: req.query.status as string | undefined }
    );
    res.json({ documents: docs });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await documentsService.getDocument(
      req.params.id,
      req.user!.tenantId,
      req.user!.id
    );
    res.json({ document: doc });
  })
);

router.post(
  "/",
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const doc = await documentsService.createDocument({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      ...req.body,
    });
    res.status(201).json({ document: doc });
  })
);

router.patch(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const doc = await documentsService.updateDocument(
      req.params.id,
      req.user!.tenantId,
      req.user!.id,
      req.body
    );
    res.json({ document: doc });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await documentsService.softDeleteDocument(
      req.params.id,
      req.user!.tenantId,
      req.user!.id
    );
    res.json({ ok: true });
  })
);

/** Generate A4 PDF (server-side) */
router.post(
  "/:id/generate-pdf",
  asyncHandler(async (req, res) => {
    const result = await generatePdfForDocument({
      documentId: req.params.id,
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
    });
    res.status(201).json({
      generatedFileId: result.generatedFileId,
      fileName: result.fileName,
      sizeBytes: result.sizeBytes,
      downloadUrl: `/api/documents/${req.params.id}/files/${result.generatedFileId}/download`,
    });
  })
);

/** Download generated PDF */
router.get(
  "/:id/files/:fileId/download",
  asyncHandler(async (req, res) => {
    const file = await prisma.generatedFile.findFirst({
      where: {
        id: req.params.fileId,
        documentId: req.params.id,
        tenantId: req.user!.tenantId,
      },
    });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const buf = await readFile(file.objectKey, file.storageProvider);
    res.setHeader("Content-Type", file.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.fileName)}"`
    );
    res.setHeader("Content-Length", buf.length);
    res.send(buf);

    await prisma.documentLog.create({
      data: {
        tenantId: req.user!.tenantId,
        documentId: req.params.id,
        userId: req.user!.id,
        action: "DOWNLOADED",
        details: { generatedFileId: file.id },
      },
    });
  })
);

export default router;
