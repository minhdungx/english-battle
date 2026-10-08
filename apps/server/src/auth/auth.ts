import "../env.js";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { bearer, emailOTP } from "better-auth/plugins";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import { hashPassword as legacyHashPassword, verifyPassword as legacyVerifyPassword } from "./user-store.js";
import type { AuthUser } from "./user-store.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: databaseUrl });
const frontendOrigin = process.env.AUTH_FRONTEND_URL || "http://localhost:3000";
const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3001";
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is required in production");
if (isProduction && !process.env.BETTER_AUTH_URL) throw new Error("BETTER_AUTH_URL is required in production");
if (isProduction && !process.env.AUTH_FRONTEND_URL) throw new Error("AUTH_FRONTEND_URL is required in production");

function hashOtp(otp: string): Promise<string> {
  return Promise.resolve(createHash("sha256").update(otp).digest("hex"));
}

async function hashPassword(password: string): Promise<string> {
  return legacyHashPassword(password);
}

async function verifyPassword({ password, hash }: { password: string; hash: string }): Promise<boolean> {
  return legacyVerifyPassword(password, hash);
}

async function sendAuthEmail(email: string, otp: string, type: "sign-in" | "email-verification" | "forget-password" | "change-email"): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    if (isProduction) throw new Error("Email delivery is not configured");
    console.info(`[auth] ${type} OTP for ${email}: ${otp}`);
    return;
  }

  const subject = type === "email-verification" || type === "change-email"
    ? "Xác thực email English Battle"
    : type === "forget-password"
      ? "Mã khôi phục mật khẩu English Battle"
      : "Mã đăng nhập English Battle";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text: `Mã xác nhận của bạn là ${otp}. Mã có hiệu lực trong 5 phút.`,
    }),
  });

  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [frontendOrigin, baseURL],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    storage: "database",
    modelName: "rate_limit",
    fields: { lastRequest: "last_request" },
  },
  database: pool,
  defaultCookieAttributes: {
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  },
  user: {
    modelName: "users",
    fields: {
      createdAt: "created_at",
      updatedAt: "updated_at",
      emailVerified: "email_verified",
    },
    additionalFields: {
      experience: {
        type: "number",
        input: false,
        defaultValue: 0,
      },
    },
  },
  session: {
    modelName: "auth_sessions",
    fields: {
      expiresAt: "expires_at",
      token: "token",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      userId: "user_id",
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: {
    modelName: "auth_accounts",
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      scope: "scope",
      password: "password",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "auth_verifications",
    fields: {
      identifier: "identifier",
      value: "value",
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    password: { hash: hashPassword, verify: verifyPassword },
  },
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            mapProfileToUser: (profile) => ({
              name: String(profile.name || profile.email?.split("@")[0] || "Player").trim().slice(0, 20) || "Player",
            }),
          },
        },
      }
    : {}),
  plugins: [
    bearer(),
    emailOTP({
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: { hash: hashOtp },
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendAuthEmail(email, otp, type);
      },
    }),
  ],
});

function toAuthUser(user: { id: string; name: string; email: string; createdAt: Date; experience?: number }): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.getTime(),
    experience: user.experience ?? 0,
  };
}

export async function getSessionUser(headers: Headers | IncomingHttpHeaders): Promise<AuthUser | undefined> {
  const session = await auth.api.getSession({ headers: headers instanceof Headers ? headers : fromNodeHeaders(headers) });
  return session?.user ? toAuthUser(session.user) : undefined;
}

export { pool };
