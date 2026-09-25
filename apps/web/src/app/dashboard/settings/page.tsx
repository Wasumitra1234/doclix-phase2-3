"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, setToken, subscriptionsApi } from "@/lib/api";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    authApi.me().then(setUser).catch(console.error);
    subscriptionsApi.plans().then((r) => setPlans(r.plans)).catch(() => {});
  }, []);

  function logout() {
    setToken(null);
    router.replace("/login");
  }

  async function pay(planId: string) {
    setPaying(planId);
    setMsg("");
    try {
      const { order, keyId, plan } = await subscriptionsApi.createOrder(planId);
      // Load Razorpay checkout script
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load Razorpay"));
          document.body.appendChild(s);
        });
      }
      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Doclix",
        description: plan.name,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await subscriptionsApi.verify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planId,
            });
            setMsg("Payment successful — plan activated");
            const u = await authApi.me();
            setUser(u);
          } catch (e: any) {
            setMsg(e.message || "Verification failed");
          }
        },
        theme: { color: "#0f172a" },
      });
      rzp.open();
    } catch (err: any) {
      setMsg(err.message || "Could not start payment");
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <h2 className="text-lg font-bold tracking-tight">Account</h2>

      {user && (
        <div className="card space-y-1.5">
          <p className="font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="text-sm text-slate-500">{user.tenant?.name}</p>
          <p className="text-xs text-slate-400">Role: {user.role}</p>
        </div>
      )}

      {user?.subscription && (
        <div className="card">
          <h3 className="font-semibold text-sm mb-2">Current plan</h3>
          <p className="text-sm">
            <strong>{user.subscription.plan?.name || user.subscription.plan?.code}</strong>
          </p>
          <p className="text-sm text-slate-500">Status: {user.subscription.status}</p>
          {user.subscription.periodEnd && (
            <p className="text-xs text-slate-400 mt-1">
              Until {new Date(user.subscription.periodEnd).toLocaleDateString("en-IN")}
            </p>
          )}
        </div>
      )}

      {msg && (
        <div className="rounded-2xl bg-slate-100 text-sm px-4 py-3 text-slate-700">{msg}</div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-3">Upgrade</h3>
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.id} className="card !p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-slate-500">
                  ₹{(p.priceInPaise / 100).toLocaleString("en-IN")}/{p.interval === "YEARLY" ? "yr" : "mo"}
                  {p.documentsLimit === -1 ? " · Unlimited" : ` · ${p.documentsLimit} docs`}
                </p>
              </div>
              <button
                className="btn-primary !w-auto !min-h-[40px] !px-4 text-sm"
                disabled={paying === p.id}
                onClick={() => pay(p.id)}
              >
                {paying === p.id ? "…" : "Pay"}
              </button>
            </li>
          ))}
        </ul>
        {!plans.length && (
          <p className="text-xs text-slate-400">
            Plans load from API. Razorpay keys required in cloud env for checkout.
          </p>
        )}
      </div>

      <button className="btn-ghost text-red-600 border-red-100" onClick={logout}>
        Logout
      </button>
    </div>
  );
}
