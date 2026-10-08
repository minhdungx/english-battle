"use client";

import React, { useEffect, useRef } from "react";
import { sound } from "@/lib/sound";

interface WordTilesProps {
  wordLength: number;
  revealedPositions: Record<number, string>;
}

export function WordTiles({ wordLength, revealedPositions }: WordTilesProps) {
  const prevCountRef = useRef(Object.keys(revealedPositions).length);

  // Play subtle hint sound whenever a new character is revealed
  useEffect(() => {
    const currentCount = Object.keys(revealedPositions).length;
    if (currentCount > prevCountRef.current) {
      sound.playHint();
    }
    prevCountRef.current = currentCount;
  }, [revealedPositions]);

  const indices = Array.from({ length: wordLength }, (_, i) => i);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 py-6 px-2 select-none">
      {indices.map((idx) => {
        const char = revealedPositions[idx];
        const isRevealed = char !== undefined;
        const isSpace = char === " ";
        const isHyphen = char === "-";

        if (isSpace) {
          return <div key={idx} className="w-4 md:w-6" />;
        }

        if (isHyphen) {
          return (
            <div
              key={idx}
              className="w-10 h-12 md:w-14 md:h-16 flex items-center justify-center text-2xl md:text-3xl font-black text-slate-400"
            >
              -
            </div>
          );
        }

        return (
          <div
            key={idx}
            className={`w-10 h-13 md:w-14 md:h-18 rounded-xl flex items-center justify-center font-mono font-black text-2xl md:text-3xl transition-all duration-300 shadow-sm ${
              isRevealed
                ? "bg-gradient-to-b from-indigo-500/20 to-purple-600/30 border-2 border-indigo-400/80 text-white shadow-indigo-500/20 animate-pop scale-100 ring-2 ring-indigo-500/20"
                : "bg-slate-800/60 border-2 border-dashed border-slate-700/80 text-transparent"
            }`}
          >
            {isRevealed ? (
              <span className="drop-shadow-[0_2px_8px_rgba(99,102,241,0.5)]">
                {char}
              </span>
            ) : (
              <span className="text-slate-600 text-lg">_</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
