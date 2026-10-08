"use client";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Sparkles, Copy, Check, LayoutDashboard, LogIn, UserRound } from "lucide-react";
import { sound } from "@/lib/sound";
import { getSession } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

interface NavbarProps {
  roomCode?: string;
}

export function Navbar({ roomCode }: NavbarProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setIsMuted(sound.isMuted());
    getSession().then((user) => setUserName(user?.name ?? null));
  }, []);

  const handleToggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full bg-[#161411]/85 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-[#ff5b24] flex items-center justify-center text-[#1d130e] shadow-lg shadow-orange-950/60 group-hover:-rotate-6 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-[#fff6e8]">
              English <span className="text-[#ff7a3d]">Battle</span>
            </span>
          </div>
        </a>

        <div className="flex items-center gap-3">
          {userName ? <><a href="/dashboard" className="hidden items-center gap-1.5 text-sm font-bold text-[#ffbd91] sm:flex"><LayoutDashboard className="h-4 w-4" /> Dashboard</a><a href="/profile" className="hidden items-center gap-1.5 text-sm font-bold text-[#ffbd91] sm:flex"><UserRound className="h-4 w-4" /> {userName}</a><button onClick={() => { void authClient.signOut().then(() => { setUserName(null); window.location.href = "/login"; }); }} className="hidden text-sm font-bold text-stone-400 sm:flex">Thoát</button></> : <a href="/login" className="hidden items-center gap-1.5 text-sm font-bold text-[#ffbd91] sm:flex"><LogIn className="h-4 w-4" /> Đăng nhập</a>}
          {roomCode && (
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 text-sm font-semibold transition-all active:scale-95"
              title="Nhấn để sao chép mã phòng"
            >
              <span className="text-xs text-stone-500">PHÒNG:</span>
              <span className="tracking-widest text-[#ff9a62] font-mono font-bold">
                {roomCode}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-lime-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-stone-500" />
              )}
            </button>
          )}

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 transition-colors"
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-[#ff8561]" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#ffc468]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
