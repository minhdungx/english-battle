"use client";

import React, { useEffect, useState } from "react";
import { RoundEndPayload } from "@bufobia/shared";
import { CheckCircle2, Clock, Trophy } from "lucide-react";

interface RoundResultModalProps {
  data: RoundEndPayload;
}

export function RoundResultModal({ data }: RoundResultModalProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const totalMs = data.nextRoundInMs || 4000;
    const interval = 50;
    const step = (interval / totalMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        return next > 0 ? next : 0;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [data.nextRoundInMs]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-pop">
        {/* Top Timer Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Answer section */}
        <div className="text-center mb-6 pt-2">
          <span className="inline-block text-xs uppercase tracking-widest font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 mb-2">
            ĐÁP ÁN VÒNG {data.round} / {data.totalRounds}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-wide font-mono">
            {data.answer}
          </h2>
          {data.pronunciation && (
            <div className="text-slate-400 font-mono text-sm mt-0.5">
              {data.pronunciation}
            </div>
          )}
          <div className="text-emerald-400 font-medium text-base mt-1">
            &ldquo;{data.meaning}&rdquo;
          </div>
        </div>

        {/* Round Rankings */}
        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between px-2 pb-1 border-b border-slate-800">
            <span>Người chơi</span>
            <span>Thời gian / Điểm</span>
          </div>

          {data.results.map((res, idx) => (
            <div
              key={res.playerId}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                res.isCorrect
                  ? "bg-slate-800/80 border-slate-700 text-slate-100"
                  : "bg-slate-900/50 border-slate-800/60 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold w-5 text-center text-slate-400">
                  {idx === 0 && res.isCorrect
                    ? "🥇"
                    : idx === 1 && res.isCorrect
                    ? "🥈"
                    : idx === 2 && res.isCorrect
                    ? "🥉"
                    : `${idx + 1}`}
                </span>
                <span className="font-medium text-sm md:text-base">
                  {res.nickname}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {res.isCorrect && res.responseTimeMs ? (
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {(res.responseTimeMs / 1000).toFixed(2)}s
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">--</span>
                )}
                <span
                  className={`font-mono font-bold text-sm md:text-base ${
                    res.scoreEarned > 0 ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  +{res.scoreEarned}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-slate-400">
          Chuyển sang câu tiếp theo sau giây lát...
        </div>
      </div>
    </div>
  );
}
