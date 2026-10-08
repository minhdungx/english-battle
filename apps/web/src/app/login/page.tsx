"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { authClient } from "@/lib/auth-client";

type AuthStep = "credentials" | "verify" | "forgot" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState<AuthStep>("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const run = async (action: () => Promise<{ error?: { message?: string } | null }>) => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await action();
      if (result.error) setError(result.error.message || "Không thể thực hiện yêu cầu.");
      return !result.error;
    } catch {
      setError("Không kết nối được tới server.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const submitCredentials = async (event: FormEvent) => {
    event.preventDefault();
    if (isRegistering) {
      const ok = await run(() => authClient.signUp.email({ name, email, password }));
      if (ok) setStep("verify");
      return;
    }

    let result;
    try {
      result = await authClient.signIn.email({ email, password });
    } catch {
      setError("Không kết nối được tới server.");
      return;
    }
    if (!result.error) {
      router.push("/");
      return;
    }
    if (result.error.code === "EMAIL_NOT_VERIFIED") {
      const sent = await run(() => authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }));
      if (sent) setStep("verify");
      return;
    }
    setError(result.error.message || "Email hoặc mật khẩu không đúng.");
  };

  const verifyEmail = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await run(() => authClient.emailOtp.verifyEmail({ email, otp }));
    if (!ok) return;
    let signedIn;
    try {
      signedIn = await authClient.signIn.email({ email, password });
    } catch {
      return setError("Không kết nối được tới server.");
    }
    if (signedIn.error) return setError(signedIn.error.message || "Email đã xác thực, hãy đăng nhập lại.");
    router.push("/");
  };

  const requestReset = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await run(() => authClient.emailOtp.requestPasswordReset({ email }));
    if (ok) {
      setMessage("Nếu email tồn tại, mã khôi phục đã được gửi.");
      setStep("reset");
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await run(() => authClient.emailOtp.resetPassword({ email, otp, password }));
    if (ok) {
      setMessage("Mật khẩu đã được cập nhật. Bạn có thể đăng nhập.");
      setStep("credentials");
      setIsRegistering(false);
      setOtp("");
    }
  };

  const signInGoogle = async () => {
    setError(null);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      if (result.error) setError(result.error.message || "Không thể đăng nhập bằng Google.");
    } catch {
      setError("Không kết nối được tới server.");
    }
  };

  const title = step === "verify" ? "Xác thực email" : step === "forgot" || step === "reset" ? "Khôi phục mật khẩu" : isRegistering ? "Tạo tài khoản" : "Chào mừng trở lại";

  return (
    <>
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4">
        <div className="w-full rounded-2xl border border-white/10 bg-[#1b1814] p-6 shadow-2xl">
          <p className="font-mono text-xs tracking-[.16em] text-[#ff9a62]">TÀI KHOẢN</p>
          <h1 className="mt-2 text-3xl font-black text-[#fff7ea]">{title}</h1>
          <p className="mt-2 text-sm text-stone-400">{step === "verify" ? `Nhập mã 6 số đã gửi tới ${email}.` : "Đăng nhập để xem dashboard và dùng cùng một tên ở mọi trận."}</p>
          {error && <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
          {message && <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}

          {step === "credentials" && (
            <form onSubmit={submitCredentials} className="mt-5 space-y-3">
              {isRegistering && <input required minLength={2} maxLength={20} value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên hiển thị" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" />}
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" />
              <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu (ít nhất 8 ký tự)" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" />
              <button disabled={submitting} className="w-full rounded-xl bg-[#ff6930] py-3 font-black text-[#2b130a] disabled:opacity-50">{submitting ? "ĐANG XỬ LÝ..." : isRegistering ? "TẠO TÀI KHOẢN" : "ĐĂNG NHẬP"}</button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={verifyEmail} className="mt-5 space-y-3">
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Mã OTP 6 số" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-center font-mono text-xl tracking-[.35em] text-white outline-none focus:border-[#ff7a3d]" />
              <button disabled={submitting} className="w-full rounded-xl bg-[#ff6930] py-3 font-black text-[#2b130a] disabled:opacity-50">XÁC THỰC EMAIL</button>
              <button type="button" disabled={submitting} onClick={() => run(() => authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }))} className="w-full text-sm font-semibold text-[#ffbd91]">Gửi lại mã</button>
            </form>
          )}

          {step === "forgot" && (
            <form onSubmit={requestReset} className="mt-5 space-y-3">
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email tài khoản" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" />
              <button disabled={submitting} className="w-full rounded-xl bg-[#ff6930] py-3 font-black text-[#2b130a] disabled:opacity-50">GỬI MÃ KHÔI PHỤC</button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={resetPassword} className="mt-5 space-y-3">
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Mã OTP 6 số" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-center font-mono text-xl tracking-[.35em] text-white outline-none focus:border-[#ff7a3d]" />
              <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu mới" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" />
              <button disabled={submitting} className="w-full rounded-xl bg-[#ff6930] py-3 font-black text-[#2b130a] disabled:opacity-50">ĐẶT MẬT KHẨU MỚI</button>
            </form>
          )}

          {step === "credentials" && !isRegistering && (
            <>
              <button type="button" onClick={signInGoogle} className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 py-3 font-bold text-white hover:bg-white/10">Tiếp tục với Google</button>
              <button type="button" onClick={() => { setStep("forgot"); setError(null); setMessage(null); }} className="mt-4 w-full text-sm font-semibold text-[#ffbd91]">Quên mật khẩu?</button>
            </>
          )}
          {step === "credentials" && <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(null); setMessage(null); }} className="mt-4 w-full text-sm font-semibold text-[#ffbd91]">{isRegistering ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}</button>}
          {step !== "credentials" && <button type="button" onClick={() => { setStep("credentials"); setError(null); setMessage(null); }} className="mt-4 w-full text-sm font-semibold text-[#ffbd91]">Quay lại đăng nhập</button>}
        </div>
      </main>
    </>
  );
}
