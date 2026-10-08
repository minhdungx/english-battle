"use client";

import React, { useEffect } from "react";
import { sound } from "@/lib/sound";

interface CountdownOverlayProps {
  count: number;
  text?: string;
}

export function CountdownOverlay({ count, text }: CountdownOverlayProps) {
  useEffect(() => {
    if (count > 0) {
      sound.playCountdown();
    } else {
      sound.playGameStart();
    }
  }, [count]);

  return (
    <div className="fixed right-4 top-24 z-50 select-none animate-fadeIn">
      <div className="rounded-2xl border border-indigo-300/40 bg-slate-950/95 px-5 py-4 text-center shadow-2xl shadow-indigo-950/50">
        <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">
          {text || "Chuẩn bị"}
        </div>
        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-200 to-indigo-500 animate-pop drop-shadow-[0_10px_25px_rgba(99,102,241,0.5)]">
          {count > 0 ? count : "BẮT ĐẦU!"}
        </div>
      </div>
    </div>
  );
}
