"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { getSession, updateProfile } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSession().then((user) => {
      if (!user) return router.replace("/login");
      setName(user.name);
    });
  }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const result = await updateProfile({ currentPassword, name, ...(newPassword ? { newPassword } : {}) });
    if (!result.user) return setMessage(result.error || "Không thể cập nhật hồ sơ.");
    setCurrentPassword("");
    setNewPassword("");
    setMessage("Đã lưu thay đổi.");
  };

  return <><Navbar /><main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4"><form onSubmit={submit} className="w-full rounded-2xl border border-white/10 bg-[#1b1814] p-6 shadow-2xl"><p className="font-mono text-xs tracking-[.16em] text-[#ff9a62]">HỒ SƠ</p><h1 className="mt-2 text-3xl font-black text-[#fff7ea]">Thông tin người dùng</h1><p className="mt-2 text-sm text-stone-400">Đổi tên không cần mật khẩu. Để đổi mật khẩu, nhập mật khẩu hiện tại.</p>{message && <p className="mt-4 rounded-lg border border-[#ffbd91]/30 bg-[#ffbd91]/10 p-3 text-sm text-[#ffdbbe]">{message}</p>}<div className="mt-5 space-y-3"><label className="block text-sm text-stone-300">Tên hiển thị<input required minLength={2} maxLength={20} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" /></label><label className="block text-sm text-stone-300">Mật khẩu hiện tại <span className="text-stone-500">(chỉ cần khi đổi mật khẩu)</span><input type="password" minLength={8} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" /></label><label className="block text-sm text-stone-300">Mật khẩu mới <span className="text-stone-500">(để trống nếu không đổi)</span><input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#28231d] px-4 py-3 text-white outline-none focus:border-[#ff7a3d]" /></label></div><button className="mt-5 w-full rounded-xl bg-[#ff6930] py-3 font-black text-[#2b130a]">LƯU THAY ĐỔI</button></form></main></>;
}
