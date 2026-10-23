"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (ok) {
        setIsRegistering(false);
        setMessage("Tạo tài khoản thành công. Bạn có thể đăng nhập.");
      }
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
    setError(result.error.message || "Email hoặc mật khẩu không đúng.");
  };
  const title = isRegistering ? "Tạo tài khoản" : "Chào mừng trở lại";

  return (
    <>
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4">
        <div className="w-full rounded-2xl border border-white/10 bg-[#1b1814] p-6 shadow-2xl">
          <p className="font-mono text-xs tracking-[.16em] text-[#ff9a62]">TÀI KHOẢN</p>
          <h1 className="mt-2 text-3xl font-black text-[#fff7ea]">{title}</h1>
          <p className="mt-2 text-sm text-stone-400">Đăng nhập để xem dashboard và dùng cùng một tên ở mọi trận.</p>
          {error && <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
          {message && <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}

          <form onSubmit={submitCredentials} className="mt-5 space-y-3">
            {isRegistering && <input required minLength={2} maxLength={20} value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên hiển thị" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" />}
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" />
            <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu (ít nhất 8 ký tự)" className="w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" />
            <button disabled={submitting} className="w-full rounded-xl bg-[#ff6930] py-3 font-black text-[#2b130a] disabled:opacity-50">{submitting ? "ĐANG XỬ LÝ..." : isRegistering ? "TẠO TÀI KHOẢN" : "ĐĂNG NHẬP"}</button>
          </form>
          <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(null); setMessage(null); }} className="mt-4 w-full text-sm font-semibold text-[#ffbd91]">{isRegistering ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}</button>
        </div>
      </main>
    </>
  );
}
