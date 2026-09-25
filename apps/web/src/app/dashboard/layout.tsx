"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, setToken } from "@/lib/api";
import { BottomNav } from "@/components/layout/BottomNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("doclix_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        setReady(true);
      })
      .catch(() => {
        setToken(null);
        router.replace("/login");
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              D
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate">
                {user?.tenant?.name || "Doclix"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.subscription && (
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {user.subscription.plan?.code || "Trial"}
              </span>
            )}
            <Link
              href="/dashboard/templates"
              className="btn-pill bg-slate-900 text-white text-xs !min-h-[36px] !px-3.5"
            >
              + Create
            </Link>
          </div>
        </div>
      </header>
      <div className="px-4 py-5 max-w-lg mx-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
