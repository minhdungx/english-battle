"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { sound } from "@/lib/sound";
import { PlayerAnswerSubmissionResult } from "@bufobia/shared";

interface AnswerInputProps {
  roundId: string;
  hasAnsweredCorrectly: boolean;
  scoreEarned?: number;
  autoAdvance?: boolean;
  disabledMessage?: string;
  onSubmit: (roundId: string, answer: string) => Promise<PlayerAnswerSubmissionResult>;
}

export function AnswerInput({
  roundId,
  hasAnsweredCorrectly,
  scoreEarned,
  autoAdvance = false,
  disabledMessage,
  onSubmit,
}: AnswerInputProps) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on round mount or round change
  useEffect(() => {
    setValue("");
    setErrorMessage(null);
    setIsShaking(false);
    setIsAdvancing(false);
    if (!hasAnsweredCorrectly) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [roundId, hasAnsweredCorrectly]);

  useEffect(() => {
    if (!isSubmitting && !hasAnsweredCorrectly && !isAdvancing) inputRef.current?.focus();
  }, [isSubmitting, hasAnsweredCorrectly, isAdvancing]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const submittedValue = value;
    const trimmed = submittedValue.trim();
    if (!trimmed || isSubmitting || hasAnsweredCorrectly || isAdvancing || disabledMessage) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await onSubmit(roundId, trimmed);

      if (result.correct) {
        sound.playCorrect();
        if (autoAdvance) setIsAdvancing(true);
      } else {
        sound.playWrong();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        if (result.cooldown) {
          setErrorMessage("Thao tác quá nhanh, vui lòng thử lại sau giây lát.");
        } else {
          setValue((current) => (current === submittedValue ? "" : current));
        }
      }
    } catch {
      setErrorMessage("Lỗi kết nối khi gửi câu trả lời.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasAnsweredCorrectly && !autoAdvance) {
    return (
      <div className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-emerald-300 shadow-lg shadow-emerald-950/50 animate-pop">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-base md:text-lg">Tuyệt vời, bạn đã trả lời đúng!</div>
            <div className="text-xs md:text-sm text-emerald-400/80">
              Đang đợi những người chơi khác hoàn thành...
            </div>
          </div>
        </div>
        {scoreEarned !== undefined && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-extrabold text-lg md:text-xl">
            +{scoreEarned}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center transition-all ${
          isShaking ? "animate-shake" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={isAdvancing || Boolean(disabledMessage)}
          onChange={(e) => setValue(e.target.value)}
          placeholder={disabledMessage || "Nhập từ tiếng Anh dự đoán..."}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          className={`w-full py-3.5 pl-5 pr-14 rounded-2xl bg-slate-800/90 border-2 text-white font-medium placeholder-slate-500 focus:outline-none transition-all shadow-inner text-base md:text-lg ${
            isShaking
              ? "border-rose-500/80 ring-2 ring-rose-500/20"
              : "border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
          }`}
        />
        <button
          type="submit"
          disabled={!value.trim() || isSubmitting || isAdvancing || Boolean(disabledMessage)}
          className="absolute right-2 top-2 bottom-2 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold transition-all active:scale-95 flex items-center justify-center shadow-md shadow-indigo-600/30"
          title="Gửi câu trả lời (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {errorMessage && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 justify-center">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
      {disabledMessage && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-cyan-300 justify-center">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{disabledMessage}</span>
        </div>
      )}
    </div>
  );
}
