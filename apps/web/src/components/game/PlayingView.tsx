"use client";

import React, { useEffect, useRef, useState } from "react";
import { GameMode, RaceAnswerRevealPayload, RoundPublicInfo, PlayerLeaderboardEntry, PlayerAnswerSubmissionResult, PlayerAnsweredNotification } from "@bufobia/shared";
import { WordTiles } from "./WordTiles";
import { AnswerInput } from "./AnswerInput";
import { RaceTrack } from "./RaceTrack";
import { Clock, CheckCircle2, Flame, TriangleAlert } from "lucide-react";

interface PlayingViewProps {
  roundInfo: RoundPublicInfo;
  revealedPositions: Record<number, string>;
  players: PlayerLeaderboardEntry[];
  myPlayerId: string | null;
  hasAnsweredCorrectly: boolean;
  scoreEarned?: number;
  recentAnswered: PlayerAnsweredNotification[];
  onSubmitAnswer: (roundId: string, answer: string) => Promise<PlayerAnswerSubmissionResult>;
  onRoundExpired: () => void;
  gameMode: GameMode;
  raceEndsAt?: number;
  gameStartedAt?: number;
  raceDurationMs?: number;
  extraPronunciation: string | null;
  raceAnswerReveal: RaceAnswerRevealPayload | null;
}

export function PlayingView({
  roundInfo,
  revealedPositions,
  players,
  myPlayerId,
  hasAnsweredCorrectly,
  scoreEarned,
  recentAnswered,
  onSubmitAnswer,
  onRoundExpired,
  gameMode,
  raceEndsAt,
  gameStartedAt,
  raceDurationMs,
  extraPronunciation,
  raceAnswerReveal,
}: PlayingViewProps) {
  const isMineSweeper = gameMode === "MINE_SWEEPER";
  const isRaceMode = gameMode === "RACE" || gameMode === "AMAZING_RACE" || isMineSweeper;
  const isTimedRace = gameMode === "RACE";
  const showTimer = !isRaceMode || isTimedRace || isMineSweeper;
  const timerEndsAt = isTimedRace && raceEndsAt ? raceEndsAt : roundInfo.endsAt;
  const timerDurationMs = isTimedRace && raceDurationMs ? raceDurationMs : roundInfo.durationMs;
  const myPlayer = players.find((player) => player.playerId === myPlayerId);
  const mineSweeperPlayers = isMineSweeper
    ? [...players].sort((a, b) => Number(b.playerId === myPlayerId) - Number(a.playerId === myPlayerId))
    : players;
  const myProgress = isMineSweeper ? myPlayer?.correctCount ?? 0 : myPlayer?.raceProgress ?? 0;
  const raceRanking = [...players].sort((a, b) => b.raceProgress - a.raceProgress || b.score - a.score);
  const myRaceRank = raceRanking.findIndex((player) => player.playerId === myPlayerId) + 1;
  const isLeadingRace = !isMineSweeper && isRaceMode && myRaceRank === 1 && players.length > 1;
  const isLastRace = !isMineSweeper && isRaceMode && myRaceRank === players.length && players.length > 1;
  const isHotStreak = isRaceMode && (myPlayer?.streak ?? 0) >= 3;
  const [overtakeAlert, setOvertakeAlert] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(
    Math.max(0, timerEndsAt - Date.now())
  );
  const [mineElapsedMs, setMineElapsedMs] = useState(0);
  const syncedRoundRef = useRef<string | null>(null);
  const previousRaceRankRef = useRef<number | null>(null);

  // High-precision countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, timerEndsAt - Date.now());
      setRemainingMs(diff);
      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerEndsAt]);

  useEffect(() => {
    if (!isMineSweeper || !gameStartedAt) return;
    const updateElapsed = () => setMineElapsedMs(Math.max(0, Date.now() - gameStartedAt));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 100);
    return () => window.clearInterval(interval);
  }, [gameStartedAt, isMineSweeper]);

  useEffect(() => {
    if (isRaceMode || remainingMs !== 0 || Date.now() < roundInfo.endsAt || syncedRoundRef.current === roundInfo.roundId) return;
    syncedRoundRef.current = roundInfo.roundId;
    onRoundExpired();
  }, [isRaceMode, onRoundExpired, remainingMs, roundInfo.roundId, roundInfo.endsAt]);

  useEffect(() => {
    if (isMineSweeper || !isRaceMode || !myRaceRank) return;
    const previousRank = previousRaceRankRef.current;
    previousRaceRankRef.current = myRaceRank;
    if (!previousRank || myRaceRank <= previousRank) return;
    const overtaker = raceRanking[myRaceRank - 2];
    setOvertakeAlert(`${overtaker?.nickname ?? "Đối thủ"} ĐÃ VƯỢT BẠN!`);
    const timer = window.setTimeout(() => setOvertakeAlert(null), 2000);
    return () => window.clearTimeout(timer);
  }, [isMineSweeper, isRaceMode, myRaceRank, raceRanking]);

  const progressPercent = isTimedRace
    ? Math.min(100, Math.max(0, (remainingMs / timerDurationMs) * 100))
    : isRaceMode
    ? Math.min(100, (myProgress / Math.max(1, roundInfo.totalRounds)) * 100)
    : Math.min(100, Math.max(0, (remainingMs / timerDurationMs) * 100));

  const isLowTime = !isMineSweeper && showTimer && remainingMs < 5000;
  const isFinalLap = isTimedRace && remainingMs <= Math.min(30000, timerDurationMs * 0.2);
  const partOfSpeech = {
    NOUN: "Danh từ", VERB: "Động từ", ADJECTIVE: "Tính từ", ADVERB: "Trạng từ", PHRASE: "Cụm từ", OTHER: "Loại từ khác",
  }[roundInfo.partOfSpeech];
  const formattedTime = `${((isMineSweeper ? mineElapsedMs : remainingMs) / 1000).toFixed(1)}s`;
  const answerPanel = (
    <div className={`${isRaceMode && !isMineSweeper ? "race-answer-card -mt-8 rounded-t-none pt-10" : "rounded-3xl"} ${isHotStreak ? "race-answer-card-hot" : ""} bg-slate-900/90 border border-slate-800 p-6 md:p-8 text-center shadow-xl relative overflow-hidden`}>
      {isHotStreak && <div className="race-hot-streak-badge" aria-label={`Chuỗi đúng ${myPlayer?.streak}: đang bùng cháy`}>🔥 HOT STREAK · {myPlayer?.streak}</div>}
      <div className="text-xs uppercase tracking-widest font-extrabold text-indigo-400 mb-1">
        {isRaceMode ? "TỪ CỦA BẠN" : "NGHĨA TIẾNG VIỆT"}
      </div>
      <div className="text-2xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">
        &ldquo;{roundInfo.meaning}&rdquo;
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold">
        <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-indigo-200">Loại từ: {partOfSpeech}</span>
        {extraPronunciation && <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-mono text-amber-200">/{extraPronunciation.replace(/^\/+|\/+$/g, "")}/</span>}
      </div>
      <WordTiles wordLength={roundInfo.wordLength} revealedPositions={revealedPositions} />
      <AnswerInput
        roundId={roundInfo.roundId}
        hasAnsweredCorrectly={hasAnsweredCorrectly}
        scoreEarned={scoreEarned}
        autoAdvance={isRaceMode}
        onSubmit={onSubmitAnswer}
      />
    </div>
  );

  return (
    <div className={`w-full mx-auto space-y-5 ${isRaceMode ? "max-w-6xl" : "max-w-4xl"}`}>
      {isLeadingRace && <div className="race-leader-fire pointer-events-none fixed inset-0 z-30" aria-hidden="true" />}
      {isLastRace && <div className="race-last-shadow pointer-events-none fixed inset-0 z-30" aria-hidden="true" />}
      {overtakeAlert && <div className="race-overtake-alert pointer-events-none fixed left-4 top-24 z-40 flex max-w-xs items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-950/95 p-4 shadow-[0_0_36px_rgba(255,30,30,.8)]" role="alert"><TriangleAlert className="h-8 w-8 shrink-0 text-red-200" /><div><div className="text-[10px] font-black tracking-[.18em] text-red-200">BỊ VƯỢT!</div><div className="mt-0.5 text-sm font-black text-white">{overtakeAlert}</div></div></div>}
      {/* Top Bar: Round Counter, Category, and Timer */}
      <div className={`${isRaceMode ? "race-hud" : "bg-slate-900/80 border-slate-800"} backdrop-blur border rounded-2xl p-4 shadow-lg`}>
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl font-extrabold text-sm md:text-base border ${isRaceMode ? "border-cyan-200/30 bg-cyan-300/10 text-cyan-100" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"}`}>
              {isRaceMode
                ? isTimedRace ? `QUÃNG ĐƯỜNG ${myProgress.toFixed(1)} CHẶNG` : isMineSweeper ? `Ô CỦA BẠN · ${myProgress} / ${roundInfo.totalRounds}` : `TỪ ${Math.floor(myProgress)} / ${roundInfo.totalRounds}`
                : `CÂU ${roundInfo.round} / ${roundInfo.totalRounds}`}
            </span>
            {roundInfo.category && (
              <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                {roundInfo.category}
              </span>
            )}
            {roundInfo.level && (
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                {roundInfo.level}
              </span>
            )}
          </div>

          {showTimer && <div
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono font-black text-lg md:text-xl transition-colors ${
              isLowTime ? "text-rose-400 animate-pulse" : "text-amber-400"
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>{formattedTime}</span>
          </div>}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              isLowTime
                ? "bg-rose-500"
                : "bg-gradient-to-r from-amber-500 via-indigo-500 to-violet-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {isFinalLap && (
        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/15 px-4 py-3 text-center font-black tracking-[.18em] text-rose-200 animate-pulse">
          NƯỚC RÚT CUỐI
        </div>
      )}

      {isMineSweeper && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Bàn Mine Sweeper của người chơi">
          {mineSweeperPlayers.map((player) => {
            const isMe = player.playerId === myPlayerId;
            const complete = player.completionTimeMs !== undefined;
            return (
              <article key={player.playerId} className={`rounded-2xl border p-4 transition-all ${isMe ? "col-span-2 row-span-2 border-cyan-300/60 bg-cyan-950/40 shadow-[0_0_30px_rgba(34,211,238,.16)]" : "border-slate-700 bg-slate-900/80"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-black text-white">{player.nickname}{isMe ? " · Bạn" : ""}</span>
                  {complete && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-label="Đã hoàn thành" />}
                </div>
                <p className={`mt-2 font-mono ${isMe ? "text-3xl" : "text-lg"} font-black ${complete ? "text-emerald-300" : "text-cyan-200"}`}>{player.correctCount} / {roundInfo.totalRounds}</p>
                {isMe && !complete ? answerPanel : <p className="mt-1 text-xs text-slate-400">{complete ? `Hoàn tất ${(player.completionTimeMs! / 1000).toFixed(1)}s` : player.forfeited ? "Đã rời trận" : "Đang giải cùng đề"}</p>}
              </article>
            );
          })}
        </section>
      )}

      {isRaceMode && !isMineSweeper && (
        <RaceTrack players={players} myPlayerId={myPlayerId} totalWords={roundInfo.totalRounds} isTimedRace={isTimedRace} />
      )}

      {!isMineSweeper && answerPanel}

      {raceAnswerReveal && (
        <aside className="pointer-events-none fixed right-4 top-24 z-40 max-w-xs rounded-2xl border border-amber-300/40 bg-slate-950/95 p-4 shadow-2xl animate-pop" aria-live="polite">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-300">Đáp án vừa qua</div>
          <div className="mt-1 font-mono text-xl font-black text-white">{raceAnswerReveal.answer}</div>
          <div className="text-sm text-slate-300">{raceAnswerReveal.meaning}</div>
          {raceAnswerReveal.pronunciation && <div className="mt-1 font-mono text-xs text-slate-400">{raceAnswerReveal.pronunciation}</div>}
        </aside>
      )}

      {/* Bottom Grid: Live Players In-Round Status & Scoreboard */}
      {gameMode === "CLASSIC" && <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3 flex items-center justify-between">
          <span>Trạng thái người chơi</span>
          <span>Bảng điểm</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {players.map((p) => {
            const isMe = p.playerId === myPlayerId;
            const hasAnswered = recentAnswered.some((a) => a.playerId === p.playerId && a.isCorrect);

            return (
              <div
                key={p.playerId}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-sm transition-all ${
                  isMe
                    ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-200"
                    : "bg-slate-800/50 border-slate-700/60 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                    {p.nickname.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-xs md:text-sm truncate flex items-center gap-1">
                      {p.nickname} {isMe && "(Bạn)"}
                      {p.streak >= 2 && (
                        <span className="flex items-center text-amber-400 text-xs font-bold">
                          <Flame className="w-3 h-3" /> {p.streak}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {hasAnswered ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Đã đoán đúng
                        </span>
                      ) : (
                        <span className="text-slate-500">Đang suy nghĩ...</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="font-mono font-bold text-right pl-2">
                  <div className="text-sm text-slate-100">{p.score.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400">điểm</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>}
    </div>
  );
}
