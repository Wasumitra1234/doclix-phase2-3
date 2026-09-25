import { prisma } from "../../config/prisma";
import { DocumentStatus } from "@prisma/client";

export async function listDocuments(tenantId: string, userId: string, opts?: { status?: string }) {
  const where: any = {
    tenantId,
    deletedAt: null,
  };
  // Non-admins only see own docs for now
  where.userId = userId;
  if (opts?.status) where.status = opts.status;

  return prisma.savedDocument.findMany({
    where,
    include: {
      template: { select: { id: true, name: true, code: true, category: true } },
      templateVersion: { select: { id: true, version: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function getDocument(id: string, tenantId: string, userId: string) {
  const doc = await prisma.savedDocument.findFirst({
    where: { id, tenantId, userId, deletedAt: null },
    include: {
      template: true,
      templateVersion: {
        include: { formSchema: true },
      },
      generatedFiles: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  if (!doc) throw Object.assign(new Error("Document not found"), { status: 404 });
  return doc;
}

export async function createDocument(input: {
  tenantId: string;
  userId: string;
  templateId: string;
  title?: string;
  formData?: Record<string, unknown>;
  state?: string;
  language?: string;
}) {
  const template = await prisma.template.findFirst({
    where: {
      id: input.templateId,
      isActive: true,
      OR: [{ tenantId: null }, { tenantId: input.tenantId }],
    },
    include: { currentVersion: true },
  });

  if (!template || !template.currentVersionId || !template.currentVersion) {
    throw Object.assign(new Error("Template not found or has no published version"), { status: 404 });
  }

  // Usage check (simple)
  const activeSub = await prisma.subscription.findFirst({
    where: {
      tenantId: input.tenantId,
      status: { in: ["TRIALING", "ACTIVE"] },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (activeSub && activeSub.plan.documentsLimit !== -1) {
    const used = await prisma.usageLedger.aggregate({
      where: {
        tenantId: input.tenantId,
        metric: "DOCUMENTS_GENERATED",
        periodStart: { lte: activeSub.currentPeriodEnd },
        periodEnd: { gte: activeSub.currentPeriodStart },
      },
      _sum: { quantity: true },
    });
    const totalUsed = used._sum.quantity || 0;
    // create does not consume yet; generation will. Soft warning only here.
    if (totalUsed >= activeSub.plan.documentsLimit) {
      // Allow draft creation, block generation later
    }
  }

  const doc = await prisma.savedDocument.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      templateId: template.id,
      templateVersionId: template.currentVersionId,
      title: input.title || `${template.name} - ${new Date().toLocaleDateString("en-IN")}`,
      status: DocumentStatus.DRAFT,
      formData: input.formData || {},
      state: (input.state as any) || template.state,
      language: (input.language as any) || template.language,
    },
    include: {
      template: { select: { name: true, code: true } },
      templateVersion: {
        include: { formSchema: true },
      },
    },
  });

  await prisma.documentLog.create({
    data: {
      tenantId: input.tenantId,
      documentId: doc.id,
      userId: input.userId,
      action: "CREATED",
      details: { templateId: template.id, templateVersionId: template.currentVersionId },
    },
  });

  return doc;
}

export async function updateDocument(
  id: string,
  tenantId: string,
  userId: string,
  input: { title?: string; formData?: Record<string, unknown>; status?: DocumentStatus }
) {
  const existing = await prisma.savedDocument.findFirst({
    where: { id, tenantId, userId, deletedAt: null },
  });
  if (!existing) throw Object.assign(new Error("Document not found"), { status: 404 });

  const doc = await prisma.savedDocument.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.formData !== undefined && { formData: input.formData }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: {
      template: { select: { name: true, code: true } },
      templateVersion: { include: { formSchema: true } },
    },
  });

  await prisma.documentLog.create({
    data: {
      tenantId,
      documentId: id,
      userId,
      action: "UPDATED",
      details: { fields: Object.keys(input) },
    },
  });

  return doc;
}

export async function softDeleteDocument(id: string, tenantId: string, userId: string) {
  const existing = await prisma.savedDocument.findFirst({
    where: { id, tenantId, userId, deletedAt: null },
  });
  if (!existing) throw Object.assign(new Error("Document not found"), { status: 404 });

  await prisma.savedDocument.update({
    where: { id },
    data: { deletedAt: new Date(), status: DocumentStatus.DELETED },
  });

  await prisma.documentLog.create({
    data: {
      tenantId,
      documentId: id,
      userId,
      action: "DELETED",
    },
  });

  return { ok: true };
}
