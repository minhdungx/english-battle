"use client";

import { createAuthClient } from "better-auth/react";

export const getAuthApiUrl = () => typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: `${getAuthApiUrl()}/api/auth`,
  fetchOptions: { credentials: "include" },
});
