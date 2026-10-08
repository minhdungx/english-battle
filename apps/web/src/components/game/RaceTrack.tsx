"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Trophy } from "lucide-react";
import { PlayerAnsweredNotification, PlayerLeaderboardEntry } from "@bufobia/shared";

interface RaceTrackProps {
  players: PlayerLeaderboardEntry[];
  myPlayerId: string | null;
  recentAnswered: PlayerAnsweredNotification[];
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

export function RaceTrack({ players, myPlayerId, recentAnswered }: RaceTrackProps) {
  const trackLength = Math.max(5, ...players.map((player) => player.raceProgress + 1));
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

  const comeback = recentAnswered.find((answer) => (answer.comebackBonus ?? 0) > 0);
  const stormActive = players.some((player) => player.stormActive);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-orange-400/30 bg-[#15110e] shadow-[0_20px_60px_rgba(0,0,0,.32)]">
      {stormActive && (
        <div className="race-storm pointer-events-none" aria-hidden="true">
          <span className="race-storm-clouds" />
          <span className="race-storm-rain" />
          <span className="race-storm-lightning" />
        </div>
      )}
      <header className="flex items-center justify-between gap-3 border-b border-orange-300/15 bg-[linear-gradient(110deg,rgba(255,99,43,.18),transparent_55%)] px-4 py-3">
        <div>
          <p className="font-mono text-[10px] tracking-[.18em] text-orange-300">HORIZONTAL STREET RACE</p>
          <h2 className="font-black text-sm text-[#fff7ea]">Đúng nhanh, xe đi xa</h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-orange-300/20 bg-black/25 px-2.5 py-1 text-[10px] font-bold text-orange-200">
          <Flame className="h-3.5 w-3.5 text-orange-400" /> Đua đến hết giờ
        </div>
      </header>

      {(raceMoment || comeback) && (
        <div className="px-4 pt-3 text-center text-sm font-black text-amber-200" aria-live="polite">
          {raceMoment ?? `${comeback?.nickname} COMEBACK BOOST!`}
        </div>
      )}

      <div className="px-3 py-4 sm:px-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[.12em] text-orange-200">
          <span>Khoảng cách tương đối</span>
          <span>Người dẫn đầu đang ở phía trước →</span>
        </div>
        <div className="race-horizontal-track" aria-label="Bảng xếp hạng đường đua">
          <div className="race-horizontal-road" aria-hidden="true" />
          {players.map((player, index) => {
            const isMe = player.playerId === myPlayerId;
            const position = ranking.findIndex((racer) => racer.playerId === player.playerId) + 1;
            const progress = Math.min(94, Math.max(6, (player.raceProgress / trackLength) * 100));
            const isBoosted = (player.boostMultiplier ?? 1) > 1 && (player.boostEndsAt ?? 0) > Date.now();
            const isHot = player.streak >= 3;

            return (
              <div
                key={player.playerId}
                className={`race-horizontal-racer ${isMe ? "race-horizontal-racer-me" : ""}`}
                style={{ left: `${progress}%` }}
                aria-label={`${player.nickname}: hạng ${position}, ${player.raceProgress.toFixed(1)} chặng`}
              >
                <span className="race-horizontal-racer-label">
                  <span className={`race-position ${position === 1 ? "race-position-first" : ""}`}>
                    {position === 1 ? <Trophy className="h-3 w-3" /> : `#${position}`}
                  </span>
                  <span className="truncate">{player.nickname}</span>
                  {isMe && <span className="text-orange-300">BẠN</span>}
                  <span className="font-mono text-orange-200">{player.raceProgress.toFixed(1)}</span>
                </span>
                <span className={`race-side-car-wrap ${isBoosted ? "race-side-car-boosted" : ""} ${isHot ? "race-side-car-hot" : ""}`}>
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
