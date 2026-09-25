import { prisma } from "../../config/prisma";
import { IndianState, Language } from "@prisma/client";

export async function listTemplates(opts: {
  tenantId: string;
  state?: IndianState;
  language?: Language;
  category?: string;
  search?: string;
}) {
  const where: any = {
    isActive: true,
    OR: [{ tenantId: null }, { tenantId: opts.tenantId }],
  };

  if (opts.state) where.state = { in: [opts.state, "ALL"] };
  if (opts.language) where.language = opts.language;
  if (opts.category) where.category = opts.category;
  if (opts.search) {
    where.AND = [
      {
        OR: [
          { name: { contains: opts.search, mode: "insensitive" } },
          { code: { contains: opts.search, mode: "insensitive" } },
          { description: { contains: opts.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const templates = await prisma.template.findMany({
    where,
    include: {
      currentVersion: {
        select: {
          id: true,
          version: true,
          stampPaperTopClearanceMm: true,
          pageSize: true,
          formSchemaId: true,
        },
      },
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return templates;
}

export async function getTemplateById(id: string, tenantId: string) {
  const template = await prisma.template.findFirst({
    where: {
      id,
      isActive: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    include: {
      currentVersion: {
        include: {
          formSchema: true,
        },
      },
    },
  });

  if (!template || !template.currentVersion) {
    throw Object.assign(new Error("Template not found"), { status: 404 });
  }

  return template;
}
