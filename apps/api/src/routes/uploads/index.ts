import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { storeFile } from "../../services/storage/storage.service";
import { runOcr } from "../../services/ocr/ocr.service";
import { UploadPurpose } from "@prisma/client";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf";
    const callback = cb as (error: Error | null, acceptFile: boolean) => void;
    callback(ok ? null : new Error("Only images and PDF allowed"), ok);
  },
});

const router = Router();
router.use(requireAuth);

const PURPOSE_MAP: Record<string, UploadPurpose> = {
  aadhaar: "AADHAAR",
  pan: "PAN",
  property_doc: "PROPERTY_DOC",
  identity: "IDENTITY",
  address_proof: "ADDRESS_PROOF",
  stamp_paper_scan: "STAMP_PAPER_SCAN",
  other: "OTHER",
};

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "file is required (multipart field: file)" });
    }

    const purposeKey = String(req.body.purpose || "other").toLowerCase();
    const purpose = PURPOSE_MAP[purposeKey] || "OTHER";
    const documentId = req.body.documentId || null;
    const runOcrFlag = req.body.ocr === "true" || req.body.ocr === true;

    const stored = await storeFile({
      tenantId: req.user!.tenantId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: "uploads",
    });

    let ocrText: string | null = null;
    let ocrData: object | null = null;

    if (runOcrFlag) {
      const ocr = await runOcr({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        purpose,
      });
      ocrText = ocr.text || null;
      ocrData = ocr.data;
    }

    const row = await prisma.upload.create({
      data: {
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        documentId,
        purpose,
        status: "READY",
        storageProvider: stored.storageProvider,
        bucket: stored.bucket,
        objectKey: stored.objectKey,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: stored.sizeBytes,
        checksum: stored.checksum,
        ocrText,
        ocrData: ocrData as any,
      },
    });

    res.status(201).json({ upload: row });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const documentId = req.query.documentId as string | undefined;
    const where: any = { tenantId: req.user!.tenantId, deletedAt: null };
    if (documentId) where.documentId = documentId;

    const uploads = await prisma.upload.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ uploads });
  })
);

export default router;
