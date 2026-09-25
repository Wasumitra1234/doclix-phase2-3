import { Router, raw } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as razorpay from "../../services/payments/razorpay.service";

const router = Router();

// Razorpay sends JSON; we need raw body for signature in production.
// Using json parsed body + event id for idempotency in this build.
router.post(
  "/razorpay",
  asyncHandler(async (req, res) => {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const payload = req.body;
    const eventId = payload?.event_id || payload?.id || `evt_${Date.now()}`;
    const eventType = payload?.event || "unknown";

    // Optional signature check when secret is set
    if (process.env.RAZORPAY_WEBHOOK_SECRET && signature) {
      const raw = JSON.stringify(payload);
      const ok = razorpay.verifyWebhookSignature(raw, signature);
      if (!ok) {
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const result = await razorpay.handleWebhookEvent({
      eventId: String(eventId),
      eventType,
      payload,
      signature,
    });

    res.json(result);
  })
);

export default router;
