import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateBody } from "../../utils/validate";
import { requireAuth } from "../../middleware/auth";
import * as authService from "../../services/auth/auth.service";

const router = Router();

const registerSchema = z.object({
  tenantName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.register(req.body);
    res.status(201).json(data);
  })
);

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    res.json(data);
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await authService.getMe(req.user!.id);
    res.json(data);
  })
);

export default router;
