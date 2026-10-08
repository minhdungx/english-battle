"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { getApiUrl, getSession } from "@/lib/auth";

interface DashboardStats { users: number; activeRooms: number; connectedPlayers: number; gamesInProgress: number; vocabularyCount: number; }

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const user = await getSession();
      if (!user) {
        router.replace("/login");
        return;
      }
      const response = await fetch(`${getApiUrl()}/api/dashboard`, { credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Không thể tải dashboard.");
      setStats(body);
    })().catch((reason: Error) => setError(reason.message));
  }, [router]);
  const cards = stats && [["Tài khoản", stats.users], ["Người đang online", stats.connectedPlayers], ["Phòng hoạt động", stats.activeRooms], ["Trận đang chơi", stats.gamesInProgress], ["Từ vựng", stats.vocabularyCount]];
  return <><Navbar /><main className="mx-auto max-w-5xl px-4 py-10"><p className="font-mono text-xs tracking-[.16em] text-[#ff9a62]">DASHBOARD HỆ THỐNG</p><h1 className="mt-2 text-4xl font-black text-[#fff7ea]">Tổng quan người dùng</h1><p className="mt-2 text-sm text-stone-400">Số liệu trực tiếp của phiên server hiện tại.</p>{error && <p className="mt-6 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</p>}{!stats && !error && <p className="mt-8 text-stone-400">Đang tải số liệu...</p>}{cards && <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <div key={label as string} className="rounded-2xl border border-white/10 bg-[#1b1814] p-5"><p className="text-sm text-stone-400">{label}</p><p className="mt-2 text-4xl font-black text-[#ffc468]">{value}</p></div>)}</section>}</main></>;
}
