"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const getAuthApiUrl = () => process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && process.env.NODE_ENV === "production" ? window.location.origin : "http://localhost:3001");

export const authClient = createAuthClient({
  baseURL: `${getAuthApiUrl()}/api/auth`,
  fetchOptions: { credentials: "include" },
  plugins: [emailOTPClient()],
});
