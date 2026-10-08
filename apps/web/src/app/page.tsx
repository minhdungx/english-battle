"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { useSocket } from "@/hooks/use-socket";
import {
  VOCABULARY_CATEGORIES,
  VOCABULARY_LEVELS,
  VocabularyCategory,
  VocabularyLevel,
  GameMode,
} from "@bufobia/shared";
import {
  Sparkles,
  Users,
  PlusCircle,
  LogIn,
  Lightbulb,
  Clock,
  Trophy,
  ArrowRight,
  ShieldAlert,
  Radio,
  Flag,
  Crown,
  MessageSquare,
} from "lucide-react";
import { getSession, sendFeedback } from "@/lib/auth";

interface LeaderboardUser {
  id: string;
  name: string;
  experience: number;
}

export default function HomePage() {
  const router = useRouter();
  const { createRoom, isConnected, openRooms } = useSocket();

  const [tab, setTab] = useState<"create" | "join">("create");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roundsCount, setRoundsCount] = useState<number>(10);
  const [roundDurationMs, setRoundDurationMs] = useState<number>(20000);
  const [raceDurationMs, setRaceDurationMs] = useState<number>(120000);
  const [gameMode, setGameMode] = useState<GameMode>("CLASSIC");
  const [category, setCategory] = useState<VocabularyCategory>("ALL");
  const [level, setLevel] = useState<VocabularyLevel>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const isRaceMode = gameMode !== "CLASSIC";

  // Restore nickname from local storage if available
  useEffect(() => {
    getSession().then((user) => {
      if (!user) return router.replace("/login");
      setNickname(user.name);
    });
  }, [router]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? window.location.origin : "http://localhost:3001");
    fetch(`${baseUrl}/api/leaderboard`).then((response) => response.ok ? response.json() : []).then(setLeaderboard).catch(() => undefined);
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickname.trim();
    if (!cleanNick) {
      setError("Vui lòng nhập biệt danh của bạn.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createRoom(cleanNick, {
      roundsCount,
      roundDurationMs,
      raceDurationMs,
      gameMode,
      category,
      level,
    });

    if (res.success && res.roomCode) {
      router.push(`/room/${res.roomCode}`);
    } else {
      setError(res.error || "Không thể tạo phòng lúc này.");
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickname.trim();
    const cleanCode = roomCode.trim().toUpperCase();

    if (!cleanNick) {
      setError("Vui lòng nhập biệt danh của bạn.");
      return;
    }
    if (!cleanCode || cleanCode.length < 3) {
      setError("Vui lòng nhập mã phòng hợp lệ.");
      return;
    }

    localStorage.setItem("player_nickname", cleanNick);
    router.push(`/room/${cleanCode}`);
  };

  const handleQuickJoin = (code: string) => {
    const cleanNick = nickname.trim();
    if (!cleanNick) return router.push("/login");
    localStorage.setItem("player_nickname", cleanNick);
    router.push(`/room/${code}`);
  };

  const statusLabel = (status: "LOBBY" | "COUNTDOWN" | "PLAYING" | "ROUND_RESULT" | "GAME_RESULT") => {
    if (status === "LOBBY") return "Đang chờ";
    if (status === "COUNTDOWN") return "Sắp bắt đầu";
    return "Đang chơi";
  };

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedbackStatus(null);
    const result = await sendFeedback(feedback);
    if (result.success) {
      setFeedback("");
      setFeedbackStatus("Đã gửi góp ý. Cảm ơn bạn!");
    } else {
      setFeedbackStatus(result.error || "Không thể gửi góp ý.");
    }
  };

  return (
    <>
      <Navbar />

      <main className="flex flex-1 flex-col max-w-6xl mx-auto w-full px-4 py-8 md:py-14">
        <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-8 lg:gap-14 items-center">
          <section className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff6a2e]/10 border border-[#ff7a3d]/30 text-[#ffbd91] font-black text-[11px] uppercase tracking-[0.16em] mb-6">
              <Radio className="w-3.5 h-3.5" /> Phòng chơi trực tiếp
            </div>
            <p className="font-mono text-sm text-[#ff9a62] mb-3">01 — ENGLISH BATTLE</p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-[#fff7ea] leading-[.92] tracking-[-0.06em] mb-6">
              Đoán nhanh.<br />
              <span className="text-[#ff6930]">Leo hạng.</span>
            </h1>
            <p className="text-stone-400 text-base md:text-lg leading-relaxed max-w-xl">
              Một đấu trường từ vựng thời gian thực: nhìn nghĩa, ghép manh mối và chốt đáp án trước mọi người.
            </p>
            <div className="mt-8 grid grid-cols-3 max-w-md border-y border-white/10 py-4">
              {[['01', 'Mở manh mối'], ['20s', 'Mỗi lượt'], ['LIVE', 'Cập nhật điểm']].map(([number, label]) => (
                <div key={label} className="border-r last:border-0 border-white/10 px-3 first:pl-0">
                  <div className="font-mono font-black text-[#ffc468] text-lg">{number}</div>
                  <div className="text-[11px] leading-tight text-stone-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="w-full bg-[#1b1814]/95 border border-white/10 rounded-2xl p-5 md:p-7 shadow-2xl shadow-black/30 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#ff6930]" />
          <div className="flex items-center justify-between mb-6 pt-1">
            <div>
              <p className="font-mono text-[10px] tracking-[.18em] text-[#ff9a62]">MATCHMAKING</p>
              <h2 className="font-black text-xl text-[#fff7ea]">Vào trận ngay</h2>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${isConnected ? "text-lime-300" : "text-stone-500"}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-lime-400 animate-pulse" : "bg-stone-600"}`} />
              {isConnected ? "Đã kết nối" : "Đang kết nối"}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex rounded-lg bg-black/25 p-1 mb-6 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setTab("create");
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                tab === "create"
                  ? "bg-[#ff6930] text-[#25110a] shadow-md shadow-orange-950/40"
                  : "text-stone-500 hover:text-stone-200"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo phòng</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("join");
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                tab === "join"
                  ? "bg-[#ff6930] text-[#25110a] shadow-md shadow-orange-950/40"
                  : "text-stone-500 hover:text-stone-200"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Vào phòng</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-[#ff5b3d]/10 border border-[#ff5b3d]/30 text-[#ffb0a0] text-xs flex items-center gap-2 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {tab === "create" ? (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5 uppercase tracking-wider">
                  Biệt danh của bạn
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ví dụ: Minh, Nam, Sarah..."
                  className="w-full px-4 py-3 rounded-xl bg-[#28231d] border border-white/10 text-white font-medium placeholder-stone-600 focus:outline-none focus:border-[#ff7a3d] focus:ring-2 focus:ring-[#ff6930]/15 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {isRaceMode ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Số từ</label>
                    <div className="w-full rounded-xl bg-[#28231d] border border-white/10 px-3 py-2.5 text-xs font-semibold text-lime-300">
                      Không giới hạn
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Số câu hỏi</label>
                    <select
                      value={roundsCount}
                      onChange={(e) => setRoundsCount(Number(e.target.value))}
                      className="w-full bg-[#28231d] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-200 focus:outline-none focus:border-[#ff7a3d]"
                    >
                      <option value={5}>5 câu</option>
                      <option value={10}>10 câu</option>
                      <option value={15}>15 câu</option>
                      <option value={20}>20 câu</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {isRaceMode ? "Kết thúc sau" : "Thời gian"}
                  </label>
                  <select
                    value={isRaceMode ? raceDurationMs : roundDurationMs}
                    onChange={(e) => isRaceMode ? setRaceDurationMs(Number(e.target.value)) : setRoundDurationMs(Number(e.target.value))}
                    className="w-full bg-[#28231d] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-200 focus:outline-none focus:border-[#ff7a3d]"
                  >
                    {isRaceMode ? <>
                      <option value={60000}>1 phút</option>
                      <option value={120000}>2 phút</option>
                      <option value={180000}>3 phút</option>
                      <option value={300000}>5 phút</option>
                    </> : <>
                      <option value={15000}>15 giây</option>
                      <option value={20000}>20 giây</option>
                      <option value={30000}>30 giây</option>
                    </>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Chế độ chơi
                  </label>
                  <select
                    value={gameMode}
                    onChange={(e) => setGameMode(e.target.value as GameMode)}
                    className="w-full bg-[#28231d] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-200 focus:outline-none focus:border-[#ff7a3d]"
                  >
                    <option value="CLASSIC">Cổ điển — tính điểm từng câu</option>
                    <option value="RACE">Đua xe — giải nhiều từ nhất trong thời gian</option>
                    <option value="AMAZING_RACE">Cuộc đua kỳ thú — vòng quay, skip, đóng băng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#28231d] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-200 focus:outline-none focus:border-[#ff7a3d]"
                  >
                    {VOCABULARY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Cấp độ
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full bg-[#28231d] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-200 focus:outline-none focus:border-[#ff7a3d]"
                  >
                    {VOCABULARY_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !nickname.trim()}
                className="w-full mt-2 py-3.5 rounded-xl bg-[#ff6930] hover:bg-[#ff804c] disabled:opacity-40 text-[#2b130a] font-black text-base shadow-lg shadow-orange-950/40 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>TẠO PHÒNG MỚI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5 uppercase tracking-wider">
                  Biệt danh của bạn
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ví dụ: Minh, Nam, Sarah..."
                  className="w-full px-4 py-3 rounded-xl bg-[#28231d] border border-white/10 text-white font-medium placeholder-stone-600 focus:outline-none focus:border-[#ff7a3d] focus:ring-2 focus:ring-[#ff6930]/15 text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5 uppercase tracking-wider">
                  Mã phòng
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã 5 ký tự (VD: A7K9P)"
                  className="w-full px-4 py-3 rounded-xl bg-[#28231d] border border-white/10 text-white font-mono font-bold tracking-widest uppercase placeholder-stone-600 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-[#ff7a3d] focus:ring-2 focus:ring-[#ff6930]/15 text-base"
                />
              </div>

              <button
                type="submit"
                disabled={!nickname.trim() || !roomCode.trim()}
                className="w-full mt-2 py-3.5 rounded-xl bg-[#ff6930] hover:bg-[#ff804c] disabled:opacity-40 text-[#2b130a] font-black text-base shadow-lg shadow-orange-950/40 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>THAM GIA PHÒNG</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
          </div>
        </div>

        <section className="mt-12 rounded-2xl border border-white/10 bg-[#1b1814]/90 p-5 md:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[.18em] text-[#ff9a62]">LEADERBOARD</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-[#fff7ea]"><Crown className="h-5 w-5 text-[#ffc468]" /> Bảng xếp hạng</h2>
            </div>
            <span className="text-right text-[11px] leading-relaxed text-stone-500">Hạng cao nhận nhiều XP<br />Top 1: 100 XP</span>
          </div>
          {leaderboard.length ? <ol className="mt-5 divide-y divide-white/10">{leaderboard.map((user, index) => <li key={user.id} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${index < 3 ? "bg-[#ffc468]/15 text-[#ffc468]" : "bg-white/5 text-stone-400"}`}>#{index + 1}</span><span className="font-bold text-[#fff7ea]">{user.name}</span></div><span className="font-mono text-sm font-black text-[#ff9a62]">{user.experience.toLocaleString()} XP</span></li>)}</ol> : <p className="mt-5 text-sm text-stone-500">Chưa có người chơi đăng nhập nào nhận XP.</p>}
        </section>

        <section className="mt-12 rounded-2xl border border-[#ff7a3d]/25 bg-[#1b1814]/90 p-5 md:p-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-[#ff6930]/15 p-2 text-[#ff9a62]"><MessageSquare className="h-5 w-5" /></div><div><p className="font-mono text-[10px] tracking-[.18em] text-[#ff9a62]">HÒM THƯ GÓP Ý</p><h2 className="font-black text-xl text-[#fff7ea]">Giúp English Battle hay hơn</h2></div></div>
          <form onSubmit={submitFeedback} className="mt-4"><label className="sr-only" htmlFor="feedback">Nội dung góp ý</label><textarea id="feedback" required minLength={10} maxLength={1000} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Bạn muốn cải thiện điều gì?" className="min-h-28 w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-sm text-white outline-none focus:border-[#ff7a3d]" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-stone-500">{feedback.length}/1000 · tối thiểu 10 ký tự</span><button className="rounded-xl bg-[#ff6930] px-5 py-2.5 text-sm font-black text-[#2b130a]">GỬI GÓP Ý</button></div>{feedbackStatus && <p className="mt-3 text-sm font-semibold text-[#ffdbbe]">{feedbackStatus}</p>}</form>
        </section>

        <section className="order-first mt-0 mb-12">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="font-mono text-[10px] tracking-[.18em] text-[#ff9a62]">LIVE ROOMS</p>
              <h2 className="font-black text-2xl text-[#fff7ea]">Phòng đang mở</h2>
            </div>
            <span className="text-xs text-stone-500">{openRooms.length} phòng</span>
          </div>

          {openRooms.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {openRooms.map((room) => (
                <button
                  key={room.code}
                  type="button"
                  onClick={() => handleQuickJoin(room.code)}
                  className="text-left rounded-xl border border-white/10 bg-[#1b1814] p-4 transition-colors hover:border-[#ff7a3d]/60 hover:bg-[#252019]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-black tracking-[.16em] text-[#ffc468]">{room.code}</span>
                    <span className="rounded-full bg-lime-400/10 px-2 py-1 text-[10px] font-bold text-lime-300">
                      {statusLabel(room.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#fff7ea]">Host: {room.hostNickname}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {room.playerCount} người</span>
                    <span className="flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> {room.settings.gameMode === "CLASSIC" ? `${room.currentRound || room.totalRounds} câu` : room.settings.gameMode === "AMAZING_RACE" ? "Cuộc đua kỳ thú" : "Đua xe"}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#191612]/70 px-5 py-7 text-sm text-stone-500">
              Chưa có phòng nào đang mở. Hãy là người tạo trận đầu tiên.
            </div>
          )}
        </section>

        {/* Feature Cards / How To Play */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-[#191612]/90 p-5 md:p-6">
            <div className="font-mono text-xs text-[#ff9a62] mb-5">01 / HINTS</div>
            <div className="w-9 h-9 rounded-lg bg-[#ff6930]/10 border border-[#ff7a3d]/20 flex items-center justify-center text-[#ff9a62] mb-3">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#fff7ea] mb-1">Gợi ý từng nhịp</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              Nhìn nghĩa tiếng Việt rõ ràng. Các chữ cái tiếng Anh được mở ngẫu nhiên từng ô theo thời gian.
            </p>
          </div>

          <div className="bg-[#191612]/90 p-5 md:p-6">
            <div className="font-mono text-xs text-[#ff9a62] mb-5">02 / SPEED</div>
            <div className="w-9 h-9 rounded-lg bg-[#ffc468]/10 border border-[#ffc468]/20 flex items-center justify-center text-[#ffc468] mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#fff7ea] mb-1">Nhanh là lợi thế</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              Điểm số phụ thuộc vào tốc độ trả lời và số lượng chữ cái còn bị ẩn khi bạn nộp đáp án.
            </p>
          </div>

          <div className="bg-[#191612]/90 p-5 md:p-6">
            <div className="font-mono text-xs text-[#ff9a62] mb-5">03 / LIVE</div>
            <div className="w-9 h-9 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-300 mb-3">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#fff7ea] mb-1">Cùng một đấu trường</h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              Đồng bộ hoàn toàn giữa các người chơi. Bảng xếp hạng cập nhật tức thì sau từng câu hỏi.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
