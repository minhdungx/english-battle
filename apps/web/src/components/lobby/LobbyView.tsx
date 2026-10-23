"use client";

import React, { useState } from "react";
import {
  RoomState,
  RoomSettings,
  GAME_CONSTANTS,
  VOCABULARY_CATEGORIES,
  VOCABULARY_LEVELS,
} from "@bufobia/shared";
import {
  Crown,
  CheckCircle2,
  Clock,
  Play,
  Copy,
  Check,
  Settings,
  Users,
  LogOut,
  Sparkles,
} from "lucide-react";

interface LobbyViewProps {
  roomState: RoomState;
  myPlayerId: string | null;
  onToggleReady: (ready: boolean) => void;
  onStartGame: () => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onLeaveRoom: () => void;
}

export function LobbyView({
  roomState,
  myPlayerId,
  onToggleReady,
  onStartGame,
  onUpdateSettings,
  onLeaveRoom,
}: LobbyViewProps) {
  const [copied, setCopied] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const me = roomState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const isRaceMode = roomState.settings.gameMode !== "CLASSIC";
  const modeName = roomState.settings.gameMode === "MINE_SWEEPER" ? "Mine Sweeper" : roomState.settings.gameMode === "AMAZING_RACE" ? "Đua xe mới" : roomState.settings.gameMode === "RACE" ? "Đua xe cổ điển" : "Cổ điển";

  const handleCopy = () => {
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connectedPlayers = roomState.players.filter((p) => p.connected);
  const nonHostPlayers = connectedPlayers.filter((p) => !p.isHost);
  const allNonHostReady =
    nonHostPlayers.length === 0 || nonHostPlayers.every((p) => p.ready);

  const canStart = isHost && connectedPlayers.length >= 1 && allNonHostReady;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Banner: Room Code & Quick Share */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-center shadow-xl relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" /> PHÒNG CHỜ TRẬN ĐẤU
        </div>

        <h1 className="text-4xl md:text-6xl font-black font-mono text-white tracking-widest my-2 select-all">
          {roomState.code}
        </h1>

        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold text-slate-200 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Đã chép mã phòng!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Sao chép mã phòng</span>
              </>
            )}
          </button>

          {isHost && (
            <button
              onClick={() => setShowSettingsModal(!showSettingsModal)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold text-slate-200 transition-all active:scale-95"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Cài đặt phòng</span>
            </button>
          )}
        </div>
      </div>

      {/* Room Settings Overview or Settings Modal */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>Thông số trận đấu:</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              Chế độ: <strong className="text-white">{modeName}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {isRaceMode ? "Số từ: " : "Số câu: "}
              <strong className="text-white">{roomState.settings.roundsCount}</strong>
            </span>
            {roomState.settings.gameMode === "MINE_SWEEPER" && (
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                Người chơi: <strong className="text-white">{connectedPlayers.length} / {GAME_CONSTANTS.MAX_MINE_SWEEPER_PLAYERS}</strong>
              </span>
            )}
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {roomState.settings.gameMode === "RACE" ? "Đua trong: " : isRaceMode ? "Về đích: " : "Thời gian: "}
              <strong className="text-white">
                {roomState.settings.gameMode === "RACE"
                  ? `${roomState.settings.raceDurationMs / 60000} phút`
                  : isRaceMode
                  ? "Hoàn tất tất cả từ"
                  : `${roomState.settings.roundDurationMs / 1000}s`}
              </strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              Cấp độ: <strong className="text-white">{roomState.settings.level}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              Chủ đề: <strong className="text-white">{roomState.settings.category}</strong>
            </span>
          </div>
        </div>

        {/* Host Edit Settings Drawer */}
        {showSettingsModal && isHost && (
          <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pop">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Chế độ chơi
              </label>
              <select
                value={roomState.settings.gameMode}
                onChange={(e) => onUpdateSettings({ gameMode: e.target.value as RoomSettings["gameMode"] })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="CLASSIC">Cổ điển</option>
                <option value="RACE">Đua xe cổ điển (đúng nhanh, xe đi xa)</option>
                <option value="AMAZING_RACE">Đua xe mới (mở dần đến hết chữ)</option>
                <option value="MINE_SWEEPER">Mine Sweeper (cùng đề, tính thời gian)</option>
              </select>
            </div>
            {roomState.settings.gameMode === "RACE" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Thời gian đua</label>
                <select value={roomState.settings.raceDurationMs} onChange={(e) => onUpdateSettings({ raceDurationMs: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value={60000}>1 phút</option>
                  <option value={120000}>2 phút</option>
                  <option value={180000}>3 phút</option>
                  <option value={300000}>5 phút</option>
                </select>
              </div>
            ) : isRaceMode ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Số từ cần hoàn tất</label>
                <select
                  value={roomState.settings.roundsCount}
                  onChange={(e) => onUpdateSettings({ roundsCount: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={5}>5 từ</option>
                  <option value={10}>10 từ (Tiêu chuẩn)</option>
                  <option value={15}>15 từ</option>
                  <option value={20}>20 từ</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Số vòng chơi</label>
                <select
                  value={roomState.settings.roundsCount}
                  onChange={(e) => onUpdateSettings({ roundsCount: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={5}>5 câu</option>
                  <option value={10}>10 câu (Tiêu chuẩn)</option>
                  <option value={15}>15 câu</option>
                  <option value={20}>20 câu</option>
                </select>
              </div>
            )}

            {!isRaceMode && <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Thời gian mỗi câu
              </label>
              <select
                value={roomState.settings.roundDurationMs}
                onChange={(e) =>
                  onUpdateSettings({ roundDurationMs: Number(e.target.value) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={15000}>15 giây (Nhanh)</option>
                <option value={20000}>20 giây (Vừa)</option>
                <option value={30000}>30 giây (Thoải mái)</option>
              </select>
            </div>}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Cấp độ từ vựng
              </label>
              <select
                value={roomState.settings.level}
                onChange={(e) =>
                  onUpdateSettings({ level: e.target.value as any })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {VOCABULARY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Chủ đề
              </label>
              <select
                value={roomState.settings.category}
                onChange={(e) =>
                  onUpdateSettings({ category: e.target.value as any })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {VOCABULARY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {isRaceMode && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-orange-400/20 bg-orange-950/20 p-4">
            <div className="text-xs font-black uppercase tracking-wider text-orange-300">🏁 {roomState.settings.gameMode === "RACE" ? "Đua đến hết giờ" : roomState.settings.gameMode === "MINE_SWEEPER" ? "Chờ cả phòng hoàn tất" : "Hoàn tất để về đích"}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{roomState.settings.gameMode === "RACE" ? "Khi countdown kết thúc, xe đi xa nhất sẽ thắng." : roomState.settings.gameMode === "MINE_SWEEPER" ? "Mọi người cùng giải một bộ đề; trận chỉ kết thúc khi tất cả người chơi hoàn thành." : "Người đầu tiên trả lời đúng toàn bộ số từ của trận sẽ thắng."}</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-950/20 p-4">
            <div className="text-xs font-black uppercase tracking-wider text-amber-300">⚡ {roomState.settings.gameMode === "RACE" ? "Nhanh hơn, xa hơn" : "Mỗi từ = một chặng"}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{roomState.settings.gameMode === "RACE" ? "Trả lời càng sớm trong mỗi lượt, xe tiến càng xa." : "Mỗi đáp án đúng đưa xe tiến một chặng."}</p>
          </div>
          <div className="rounded-2xl border border-lime-400/20 bg-lime-950/20 p-4">
            <div className="text-xs font-black uppercase tracking-wider text-lime-300">💡 Manh mối dần mở</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Cả hai chế độ đua đều mở dần đến khi lộ toàn bộ từ.</p>
          </div>
        </div>
      )}

      {/* Players List Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              Danh sách người chơi ({connectedPlayers.length}{roomState.settings.gameMode === "MINE_SWEEPER" ? ` / ${GAME_CONSTANTS.MAX_MINE_SWEEPER_PLAYERS}` : ""})
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {roomState.players.map((p) => {
            const isMe = p.id === myPlayerId;
            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isMe
                    ? "bg-indigo-950/30 border-indigo-500/50 ring-1 ring-indigo-500/20"
                    : "bg-slate-800/60 border-slate-700/60"
                } ${!p.connected ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow">
                    {p.nickname.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-sm md:text-base text-slate-100 flex items-center gap-1.5 truncate">
                      {p.nickname}
                      {p.isHost && (
                        <span title="Chủ phòng">
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[10px] text-indigo-400 font-normal">
                          (Bạn)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.isHost ? (
                        <span className="text-amber-400/90 font-medium">Chủ phòng</span>
                      ) : p.ready ? (
                        <span className="text-emerald-400 font-medium">Đã sẵn sàng</span>
                      ) : (
                        <span className="text-slate-500">Chưa sẵn sàng</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {p.isHost ? (
                    <span className="w-3 h-3 rounded-full bg-amber-400 block" title="Host" />
                  ) : p.ready ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all active:scale-95 border border-slate-700"
        >
          <LogOut className="w-4 h-4" />
          <span>Rời phòng</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isHost && (
            <button
              onClick={() => onToggleReady(!me?.ready)}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-base transition-all active:scale-95 shadow-lg ${
                me?.ready
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-200"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25"
              }`}
            >
              {me?.ready ? "HỦY SẴN SÀNG" : "SẴN SÀNG"}
            </button>
          )}

          {isHost && (
            <div className="w-full sm:w-auto flex flex-col items-end">
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base md:text-lg shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>BẮT ĐẦU TRẬN ĐẤU</span>
              </button>
              {!allNonHostReady && nonHostPlayers.length > 0 && (
                <span className="text-xs text-amber-400 mt-1.5">
                  Đang chờ người chơi khác bấm Sẵn sàng...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
