"use client";

import React, { useEffect } from "react";
import { GameEndPayload } from "@bufobia/shared";
import confetti from "canvas-confetti";
import { sound } from "@/lib/sound";
import {
  Trophy,
  Zap,
  Target,
  Flame,
  RotateCcw,
  Home,
  Crown,
} from "lucide-react";

interface GameResultViewProps {
  data: GameEndPayload;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export function GameResultView({
  data,
  isHost,
  onPlayAgain,
  onLeaveRoom,
}: GameResultViewProps) {
  const isRaceMode = data.gameMode !== "CLASSIC";
  const isMineSweeper = data.gameMode === "MINE_SWEEPER";
  const partOfSpeechLabels = {
    NOUN: "Danh từ", VERB: "Động từ", ADJECTIVE: "Tính từ", ADVERB: "Trạng từ", PHRASE: "Cụm từ", OTHER: "Loại từ khác",
  } as const;
  useEffect(() => {
    sound.playVictory();

    // Trigger celebratory confetti
    try {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    } catch (e) {
      console.log("Confetti not supported in this environment");
    }
  }, []);

  const top1 = data.podium[0];
  const top2 = data.podium[1];
  const top3 = data.podium[2];
  const resultValue = (player: typeof top1) => isMineSweeper
    ? player?.completionTimeMs === undefined ? "DNF" : `${(player.completionTimeMs / 1000).toFixed(1)} giây`
    : isRaceMode
      ? `${player?.raceProgress.toFixed(1) ?? "0.0"} chặng`
      : `${player?.score.toLocaleString() ?? "0"} điểm`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-pop pb-12">
      {/* Title */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-2">
          <Trophy className="w-4 h-4" /> {isMineSweeper ? "MINE SWEEPER · KẾT QUẢ" : isRaceMode ? "HẾT GIỜ · KẾT QUẢ ĐƯỜNG ĐUA" : "KẾT QUẢ CHUNG CUỘC"}
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white">
          {isMineSweeper && top1?.completionTimeMs === undefined ? "KHÔNG CÓ NGƯỜI HOÀN TẤT" : isRaceMode ? `${top1?.nickname ?? "Người chơi"} thắng cuộc` : "BẢNG VINH DANH"}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {isMineSweeper
            ? top1?.completionTimeMs === undefined ? "Các người chơi đã rời trận trước khi hoàn tất" : `Hoàn tất trong ${(top1.completionTimeMs / 1000).toFixed(1)} giây`
            : isRaceMode
            ? `Dẫn đầu với ${top1?.raceProgress.toFixed(1) ?? "0.0"} chặng`
            : `Hoàn thành xuất sắc ${data.totalRounds} câu hỏi`}
        </p>
      </div>

      {/* Podium (Top 3) */}
      <div className="flex items-end justify-center gap-2 md:gap-6 pt-6 px-4">
        {/* 2nd Place */}
        {top2 && (
          <div className="flex flex-col items-center flex-1 max-w-[160px] animate-pop">
            <div className="text-2xl mb-1">🥈</div>
            <div className="font-bold text-sm md:text-base text-slate-200 truncate w-full text-center">
              {top2.nickname}
            </div>
            <div className="text-xs font-mono font-bold text-slate-400 mb-2">
              {resultValue(top2)}
            </div>
            <div className="w-full h-24 md:h-32 rounded-t-2xl bg-gradient-to-t from-slate-800 to-slate-700/80 border-t-2 border-x-2 border-slate-500/40 flex items-center justify-center font-black text-2xl md:text-4xl text-slate-400 shadow-lg">
              2
            </div>
          </div>
        )}

        {/* 1st Place */}
        {top1 && (
          <div className="flex flex-col items-center flex-1 max-w-[180px] z-10 animate-pop">
            <div className="relative mb-1">
              <Crown className="w-9 h-9 text-amber-400 animate-bounceShort drop-shadow-[0_4px_10px_rgba(251,191,36,0.5)]" />
            </div>
            <div className="font-black text-base md:text-lg text-amber-300 truncate w-full text-center">
              {top1.nickname}
            </div>
            <div className="text-sm font-mono font-extrabold text-amber-400 mb-2">
              {resultValue(top1)}
            </div>
            <div className="w-full h-32 md:h-44 rounded-t-2xl bg-gradient-to-t from-amber-600/30 via-amber-500/40 to-amber-400/50 border-t-2 border-x-2 border-amber-400 flex items-center justify-center font-black text-3xl md:text-5xl text-amber-300 shadow-2xl shadow-amber-500/20">
              1
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3 && (
          <div className="flex flex-col items-center flex-1 max-w-[160px] animate-pop">
            <div className="text-2xl mb-1">🥉</div>
            <div className="font-bold text-sm md:text-base text-slate-300 truncate w-full text-center">
              {top3.nickname}
            </div>
            <div className="text-xs font-mono font-bold text-amber-700/80 mb-2">
              {resultValue(top3)}
            </div>
            <div className="w-full h-18 md:h-24 rounded-t-2xl bg-gradient-to-t from-amber-950/40 to-amber-900/40 border-t-2 border-x-2 border-amber-700/40 flex items-center justify-center font-black text-xl md:text-3xl text-amber-700 shadow-md">
              3
            </div>
          </div>
        )}
      </div>

      {/* Match Highlights / Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.statistics.fastestAnswer && (
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs text-slate-400 font-semibold uppercase">
                Trả lời nhanh nhất
              </div>
              <div className="font-bold text-sm text-slate-100 truncate">
                {data.statistics.fastestAnswer.nickname} (
                {(data.statistics.fastestAnswer.responseTimeMs / 1000).toFixed(2)}s)
              </div>
              <div className="text-xs text-indigo-400 font-mono">
                Từ: {data.statistics.fastestAnswer.word}
              </div>
            </div>
          </div>
        )}

        {data.statistics.mostCorrect && (
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs text-slate-400 font-semibold uppercase">
                Đúng nhiều câu nhất
              </div>
              <div className="font-bold text-sm text-slate-100 truncate">
                {data.statistics.mostCorrect.nickname}
              </div>
              <div className="text-xs text-emerald-400 font-mono">
                {isMineSweeper
                  ? "Thời gian hoàn tất"
                  : isRaceMode
                  ? `${data.statistics.mostCorrect.count} từ đúng`
                  : `${data.statistics.mostCorrect.count} / ${data.totalRounds} câu đúng`}
              </div>
            </div>
          </div>
        )}

        {data.statistics.longestStreak && (
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs text-slate-400 font-semibold uppercase">
                Chuỗi đúng dài nhất
              </div>
              <div className="font-bold text-sm text-slate-100 truncate">
                {data.statistics.longestStreak.nickname}
              </div>
              <div className="text-xs text-rose-400 font-mono">
                {data.statistics.longestStreak.streak} câu liên tiếp 🔥
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Complete Rankings Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
          Bảng xếp hạng chi tiết
        </h3>

        <div className="space-y-2">
          {data.leaderboard.map((player, idx) => (
            <div
              key={player.playerId}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono font-bold text-slate-400 text-sm">
                  #{idx + 1}
                </span>
                <span className="font-semibold text-slate-200 text-sm md:text-base">
                  {player.nickname}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-xs text-slate-400">
                  Đúng: <strong className="text-slate-200">{player.correctCount}</strong>
                </div>
                <div className="font-mono font-extrabold text-base md:text-lg text-amber-400">
                  {resultValue(player)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Từ đã xuất hiện trong trận</h3>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {(data.reviewWords ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3">
              <div className="min-w-0">
                <div className="font-mono font-bold text-slate-100">{item.word.toUpperCase()}</div>
                <div className="truncate text-sm text-slate-400">{item.meaning}</div>
              </div>
              <div className="shrink-0 text-right text-xs text-indigo-300">
                <div>{partOfSpeechLabels[item.partOfSpeech ?? "OTHER"]}</div>
                {item.pronunciation && <div className="mt-1 font-mono text-slate-400">{item.pronunciation}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold transition-all active:scale-95"
        >
          <Home className="w-5 h-5" />
          <span>Về trang chủ</span>
        </button>

        {isHost && (
          <button
            onClick={onPlayAgain}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Chơi lại</span>
          </button>
        )}
      </div>
    </div>
  );
}
