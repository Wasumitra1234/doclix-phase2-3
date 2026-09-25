import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import * as templatesService from "../../services/templates/templates.service";
import { IndianState, Language } from "@prisma/client";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { state, language, category, search } = req.query;
    const data = await templatesService.listTemplates({
      tenantId: req.user!.tenantId,
      state: state as IndianState | undefined,
      language: language as Language | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
    });
    res.json({ templates: data });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = await templatesService.getTemplateById(req.params.id, req.user!.tenantId);
    res.json({ template: data });
  })
);

export default router;
