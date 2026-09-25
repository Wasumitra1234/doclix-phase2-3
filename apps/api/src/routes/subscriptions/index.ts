import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateBody } from "../../utils/validate";
import { prisma } from "../../config/prisma";
import * as razorpay from "../../services/payments/razorpay.service";
import { env } from "../../config/env";

const router = Router();

router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const plans = await razorpay.listPlans();
    res.json({ plans });
  })
);

router.use(requireAuth);

router.get(
  "/current",
  asyncHandler(async (req, res) => {
    const sub = await prisma.subscription.findFirst({
      where: {
        tenantId: req.user!.tenantId,
        status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ subscription: sub });
  })
);

const orderSchema = z.object({
  planId: z.string().min(1),
});

router.post(
  "/create-order",
  validateBody(orderSchema),
  asyncHandler(async (req, res) => {
    const plan = await prisma.plan.findFirst({
      where: { id: req.body.planId, isActive: true },
    });
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    if (!env.RAZORPAY_KEY_ID) {
      return res.status(503).json({
        error: "Payments not configured",
        message: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in cloud env",
      });
    }
    const order = await razorpay.createOrder({
      tenantId: req.user!.tenantId,
      planId: plan.id,
      amountInPaise: plan.priceInPaise,
    });
    res.json({
      order,
      keyId: env.RAZORPAY_KEY_ID,
      plan: { id: plan.id, name: plan.name, priceInPaise: plan.priceInPaise },
    });
  })
);

const verifySchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
  planId: z.string(),
});

router.post(
  "/verify",
  validateBody(verifySchema),
  asyncHandler(async (req, res) => {
    const ok = razorpay.verifyPaymentSignature({
      orderId: req.body.orderId,
      paymentId: req.body.paymentId,
      signature: req.body.signature,
    });
    if (!ok) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const plan = await prisma.plan.findUnique({ where: { id: req.body.planId } });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const now = new Date();
    const end = new Date(now);
    if (plan.interval === "YEARLY") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);

    const sub = await prisma.subscription.create({
      data: {
        tenantId: req.user!.tenantId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: end,
        metadata: {
          razorpayOrderId: req.body.orderId,
          razorpayPaymentId: req.body.paymentId,
        },
      },
      include: { plan: true },
    });

    res.json({ subscription: sub });
  })
);

export default router;
