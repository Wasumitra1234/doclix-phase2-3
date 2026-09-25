import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";

function client() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(new Error("Razorpay not configured"), { status: 503 });
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export async function createOrder(opts: {
  tenantId: string;
  planId: string;
  amountInPaise: number;
}) {
  const rzp = client();
  const order = await rzp.orders.create({
    amount: opts.amountInPaise,
    currency: "INR",
    receipt: `doclix_${opts.tenantId.slice(0, 8)}_${Date.now()}`,
    notes: { tenantId: opts.tenantId, planId: opts.planId },
  });
  return order;
}

export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const body = `${opts.orderId}|${opts.paymentId}`;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === opts.signature;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

/** Idempotent webhook handler */
export async function handleWebhookEvent(opts: {
  eventId: string;
  eventType: string;
  payload: any;
  signature?: string;
}) {
  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_eventId: { provider: "RAZORPAY", eventId: opts.eventId },
    },
  });
  if (existing && existing.status === "PROCESSED") {
    return { status: "already_processed" as const };
  }

  const event = await prisma.webhookEvent.upsert({
    where: {
      provider_eventId: { provider: "RAZORPAY", eventId: opts.eventId },
    },
    create: {
      provider: "RAZORPAY",
      eventId: opts.eventId,
      eventType: opts.eventType,
      payload: opts.payload,
      signature: opts.signature,
      status: "PROCESSING",
    },
    update: {
      status: "PROCESSING",
      retryCount: { increment: 1 },
    },
  });

  try {
    // Activate subscription on payment.captured / order.paid
    if (
      opts.eventType === "payment.captured" ||
      opts.eventType === "order.paid"
    ) {
      const notes = opts.payload?.payload?.payment?.entity?.notes ||
        opts.payload?.payload?.order?.entity?.notes ||
        {};
      const tenantId = notes.tenantId;
      const planId = notes.planId;
      if (tenantId && planId) {
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (plan) {
          const now = new Date();
          const end = new Date(now);
          if (plan.interval === "YEARLY") end.setFullYear(end.getFullYear() + 1);
          else end.setMonth(end.getMonth() + 1);

          await prisma.subscription.create({
            data: {
              tenantId,
              planId,
              status: "ACTIVE",
              currentPeriodStart: now,
              currentPeriodEnd: end,
              metadata: { razorpayEventId: opts.eventId },
            },
          });
        }
      }
    }

    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return { status: "processed" as const };
  } catch (err: any) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", errorMessage: err.message },
    });
    throw err;
  }
}

export async function listPlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}
