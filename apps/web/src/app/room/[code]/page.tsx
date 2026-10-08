"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { useSocket } from "@/hooks/use-socket";
import { LobbyView } from "@/components/lobby/LobbyView";
import { PlayingView } from "@/components/game/PlayingView";
import { CountdownOverlay } from "@/components/game/CountdownOverlay";
import { RoundResultModal } from "@/components/game/RoundResultModal";
import { GameResultView } from "@/components/result/GameResultView";
import { Loader2, ArrowLeft, ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const roomCode = rawCode?.toUpperCase() || "";

  const {
    isConnected,
    roomState,
    roundInfo,
    revealedPositions,
    countdown,
    roundEndData,
    gameEndData,
    myPlayerId,
    myAnswerResult,
    recentAnswered,
    extraPronunciation,
    raceAnswerReveal,
    errorMessage,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    updateSettings,
    submitAnswer,
    syncRoom,
    skipRace,
    spinAdventure,
    freezeAdventure,
    playAgain,
  } = useSocket();

  const [hasJoined, setHasJoined] = useState(false);
  const [promptNickname, setPromptNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Auto-join if nickname is in localStorage, else prompt
  useEffect(() => {
    getSession().then((user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!isConnected || !roomCode || hasJoined) return;
      joinRoom(roomCode, user.name).then((res) => {
        if (res.success) setHasJoined(true);
        else {
          setJoinError(res.error || "Không thể tham gia phòng");
          setPromptNickname(true);
        }
      });
    });
  }, [isConnected, roomCode, hasJoined, joinRoom]);

  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nicknameInput.trim();
    if (!cleanNick) return;

    setJoinError(null);
    const res = await joinRoom(roomCode, cleanNick);
    if (res.success) {
      setHasJoined(true);
      setPromptNickname(false);
    } else {
      setJoinError(res.error || "Không thể tham gia phòng");
    }
  };

  const handleLeave = () => {
    leaveRoom();
    router.push("/");
  };

  const me = roomState?.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;

  return (
    <>
      <Navbar roomCode={roomCode} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 md:py-8 flex flex-col justify-center">
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2 max-w-md mx-auto animate-shake">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Prompt Nickname Modal if joining directly via URL without prior nickname */}
        {promptNickname && !hasJoined && (
          <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-pop">
            <h2 className="text-xl font-bold text-white mb-2 text-center">
              Tham gia phòng {roomCode}
            </h2>
            <p className="text-slate-400 text-xs text-center mb-6">
              Vui lòng nhập tên của bạn trước khi bước vào phòng chờ
            </p>

            {joinError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleManualJoin} className="space-y-4">
              <input
                type="text"
                required
                maxLength={20}
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="Nhập biệt danh..."
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={!nicknameInput.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white font-bold text-sm disabled:opacity-40"
                >
                  Tham gia
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {!roomState && hasJoined && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-slate-400 text-sm">Đang tải phòng chơi...</p>
          </div>
        )}

        {/* Active Room Views */}
        {roomState && (
          <>
            {/* LOBBY / COUNTDOWN VIEW */}
            {(roomState.status === "LOBBY" || roomState.status === "COUNTDOWN") && (
              <>
                <LobbyView
                  roomState={roomState}
                  myPlayerId={myPlayerId}
                  onToggleReady={toggleReady}
                  onStartGame={startGame}
                  onUpdateSettings={updateSettings}
                  onLeaveRoom={handleLeave}
                />
                {countdown && (
                  <CountdownOverlay count={countdown.count} text={countdown.text} />
                )}
              </>
            )}

            {/* PLAYING VIEW */}
            {(roomState.status === "PLAYING" || roomState.status === "ROUND_RESULT") &&
              roundInfo && (
                <>
                  <PlayingView
                    roundInfo={roundInfo}
                    revealedPositions={revealedPositions}
                    players={roomState.players.map((p) => ({
                      playerId: p.id,
                      nickname: p.nickname,
                      score: p.score,
                      correctCount: p.correctCount,
                      raceProgress: p.raceProgress,
                      streak: p.streak,
                      fireTurnsVisible: p.fireTurnsVisible,
                      stormActive: p.stormActive,
                      connected: p.connected,
                      isHost: p.isHost,
                      boostMultiplier: p.boostMultiplier,
                      boostEndsAt: p.boostEndsAt,
                      frozenUntil: p.frozenUntil,
                      adventureSpinReady: p.adventureSpinReady,
                      adventurePendingFreeze: p.adventurePendingFreeze,
                    }))}
                    myPlayerId={myPlayerId}
                    hasAnsweredCorrectly={myAnswerResult?.correct ?? false}
                    scoreEarned={myAnswerResult?.score}
                    recentAnswered={recentAnswered}
                    onSubmitAnswer={submitAnswer}
                    onRoundExpired={syncRoom}
                    gameMode={roomState.settings.gameMode}
                    raceEndsAt={roomState.raceEndsAt}
                    raceDurationMs={roomState.settings.raceDurationMs}
                    extraPronunciation={extraPronunciation}
                    raceAnswerReveal={raceAnswerReveal}
                    onSkipRace={skipRace}
                    onSpinAdventure={spinAdventure}
                    onFreezeAdventure={freezeAdventure}
                  />

                  {roomState.settings.gameMode === "CLASSIC" && roomState.status === "ROUND_RESULT" && roundEndData && (
                    <RoundResultModal data={roundEndData} />
                  )}
                </>
              )}

            {/* GAME_RESULT VIEW */}
            {roomState.status === "GAME_RESULT" && gameEndData && (
              <GameResultView
                data={gameEndData}
                isHost={isHost}
                onPlayAgain={playAgain}
                onLeaveRoom={handleLeave}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}
