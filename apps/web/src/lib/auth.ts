"use client";

import { authClient } from "./auth-client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  experience: number;
}

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? window.location.origin : "http://localhost:3001");
}

export async function getSession(): Promise<AuthUser | null> {
  try {
    const result = await authClient.getSession();
    const user = result.data?.user;
    if (!user) return null;
    const profile = user as typeof user & { experience?: number };
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: new Date(user.createdAt).getTime(),
      experience: Number(profile.experience ?? 0),
    };
  } catch {
    return null;
  }
}

export async function updateProfile(body: { currentPassword?: string; name?: string; newPassword?: string }): Promise<{ user?: AuthUser; error?: string }> {
  try {
    if (body.name !== undefined) {
      const result = await authClient.updateUser({ name: body.name });
      if (result.error) return { error: result.error.message };
    }
    if (body.newPassword) {
      const result = await authClient.changePassword({
        currentPassword: body.currentPassword ?? "",
        newPassword: body.newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) return { error: result.error.message };
    }
    const user = await getSession();
    return user ? { user } : { error: "Phiên đăng nhập đã hết hạn." };
  } catch {
    return { error: "Không thể cập nhật hồ sơ." };
  }
}

export async function sendFeedback(message: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const response = await fetch(`${getApiUrl()}/api/feedback`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return response.json();
  } catch {
    return { error: "Không kết nối được tới server." };
  }
}
