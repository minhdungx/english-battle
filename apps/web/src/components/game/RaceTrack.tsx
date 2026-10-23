"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Trophy } from "lucide-react";
import { PlayerLeaderboardEntry } from "@bufobia/shared";

interface RaceTrackProps {
  players: PlayerLeaderboardEntry[];
  myPlayerId: string | null;
  totalWords: number;
  isTimedRace: boolean;
}

function RaceCar({ theme }: { theme: number }) {
  return (
    <span className={`race-side-car race-side-car-${theme}`} aria-hidden="true">
      <span className="race-side-car-window" />
      <span className="race-side-car-wheel race-side-car-wheel-front" />
      <span className="race-side-car-wheel race-side-car-wheel-back" />
      <span className="race-side-car-light" />
    </span>
  );
}

export function RaceTrack({ players, myPlayerId, totalWords, isTimedRace }: RaceTrackProps) {
  const ranking = [...players].sort((a, b) => b.raceProgress - a.raceProgress || b.score - a.score);
  const previousRankingRef = useRef<PlayerLeaderboardEntry[] | null>(null);
  const [raceMoment, setRaceMoment] = useState<string | null>(null);

  useEffect(() => {
    const previous = previousRankingRef.current;
    previousRankingRef.current = ranking;
    if (!previous || previous.length !== ranking.length) return;

    const previousRanks = new Map(previous.map((player, index) => [player.playerId, index]));
    const overtaker = ranking.find((player, index) => (previousRanks.get(player.playerId) ?? index) > index);
    if (!overtaker) return;
    const passed = previous[(previousRanks.get(overtaker.playerId) ?? 0) - 1];
    if (!passed) return;
    setRaceMoment(`${overtaker.nickname} vượt ${passed.nickname}!`);
    const timer = window.setTimeout(() => setRaceMoment(null), 1600);
    return () => window.clearTimeout(timer);
  }, [players]);

  const stormActive = players.some((player) => player.stormActive);
  const trackLength = isTimedRace ? Math.max(5, ...players.map((player) => player.raceProgress + 1)) : totalWords;

  return (
    <section className="race-stage relative overflow-hidden rounded-[1.75rem] border border-sky-200/30 shadow-[0_24px_70px_rgba(0,0,0,.42)]">
      {stormActive && (
        <div className="race-storm pointer-events-none" aria-hidden="true">
          <span className="race-storm-clouds" />
          <span className="race-storm-rain" />
          <span className="race-storm-lightning" />
        </div>
      )}
      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-sm">
        <div>
          <p className="font-mono text-[10px] tracking-[.2em] text-cyan-200">BUFObia SPEEDWAY</p>
          <h2 className="font-black text-sm text-white">{isTimedRace ? "Đúng nhanh, xe đi xa" : "Trả lời đúng để tăng tốc"}</h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-amber-100">
          <Flame className="h-3.5 w-3.5 text-orange-400" /> {isTimedRace ? "ĐUA ĐẾN HẾT GIỜ" : "LIVE RACE"}
        </div>
      </header>

      {raceMoment && (
        <div className="px-4 pt-3 text-center text-sm font-black text-amber-200" aria-live="polite">
          {raceMoment}
        </div>
      )}

      <div className="relative z-10 px-2 pb-3 pt-16 sm:px-4 sm:pt-20">
        <div
          className="race-horizontal-track"
          style={{ minHeight: `${Math.max(220, players.length * 62 + 30)}px` }}
          aria-label="Bảng xếp hạng đường đua"
        >
          <div className="race-horizontal-road" aria-hidden="true" />
          <div className="race-finish-line" aria-hidden="true"><span>FINISH</span></div>
          {players.map((player, index) => <div key={`lane-${player.playerId}`} className="race-lane" style={{ top: `${index * 62 + 56}px` }} aria-hidden="true" />)}
          {players.map((player, index) => {
            const isMe = player.playerId === myPlayerId;
            const position = ranking.findIndex((racer) => racer.playerId === player.playerId) + 1;
            const progress = Math.min(88, Math.max(8, (player.raceProgress / trackLength) * 100));
            const isHot = player.streak >= 3;

            return (
              <div
                key={player.playerId}
                className={`race-horizontal-racer ${isMe ? "race-horizontal-racer-me" : ""}`}
                style={{ left: `${progress}%`, top: `${index * 62 + 56}px` }}
                aria-label={`${player.nickname}: hạng ${position}, ${player.raceProgress.toFixed(1)} chặng`}
              >
                <span className="race-horizontal-racer-label">
                  <span className={`race-position ${position === 1 ? "race-position-first" : ""}`}>
                    {position === 1 ? <Trophy className="h-3 w-3" /> : `#${position}`}
                  </span>
                  <span className="truncate">{player.nickname}</span>
                  {isMe && <span className="text-cyan-300">BẠN</span>}
                  <span className="font-mono text-amber-200">{player.raceProgress.toFixed(1)}</span>
                </span>
                <span className={`race-side-car-wrap ${isHot ? "race-side-car-hot" : ""}`}>
                  <span className="race-side-car-flame" aria-hidden="true" />
                  <RaceCar theme={index % 4} />
                </span>
                {isHot && <span className="race-hot-streak">🔥 HOT {player.streak}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
