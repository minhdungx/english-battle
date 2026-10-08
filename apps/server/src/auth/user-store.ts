import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  experience: number;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export class UserStore {
  private pool: Pool;

  public constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error("DATABASE_URL is required");
    this.pool = new Pool({ connectionString });
  }

  public async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name VARCHAR(20) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        image TEXT,
        password_hash TEXT,
        experience INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        email_verified BOOLEAN NOT NULL DEFAULT FALSE
      );
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'created_at' AND data_type = 'bigint'
        ) THEN
          ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0);
        END IF;
      END $migration$;
      DROP INDEX IF EXISTS users_name_lower_idx;
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message VARCHAR(1000) NOT NULL,
        created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
      CREATE TABLE IF NOT EXISTS auth_accounts (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at TIMESTAMPTZ,
        refresh_token_expires_at TIMESTAMPTZ,
        scope TEXT,
        password TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS auth_accounts_user_id_idx ON auth_accounts (user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_provider_account_idx ON auth_accounts (provider_id, account_id);
      UPDATE users SET email_verified = TRUE WHERE email_verified IS FALSE AND password_hash IS NOT NULL;
      INSERT INTO auth_accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
      SELECT 'legacy_' || id, id, 'credential', id, password_hash, created_at, NOW()
      FROM users
      WHERE password_hash IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM auth_accounts a WHERE a.provider_id = 'credential' AND a.account_id = users.id
        );
      CREATE TABLE IF NOT EXISTS auth_verifications (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications (identifier);
      CREATE TABLE IF NOT EXISTS rate_limit (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        last_request BIGINT NOT NULL
      );
    `);
  }

  public async count(): Promise<number> {
    const result = await this.pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
    return Number(result.rows[0].count);
  }

  public async awardExperience(userId: string | undefined, amount: number): Promise<void> {
    if (userId && amount > 0) await this.pool.query("UPDATE users SET experience = experience + $1 WHERE id = $2", [amount, userId]);
  }

  public async leaderboard(): Promise<Array<Pick<AuthUser, "id" | "name" | "experience">>> {
    const result = await this.pool.query<Pick<AuthUser, "id" | "name" | "experience">>("SELECT id, name, experience FROM users ORDER BY experience DESC, created_at ASC LIMIT 10");
    return result.rows;
  }

  public async createFeedback(userId: string, message: string): Promise<string | undefined> {
    const cleanMessage = message.trim();
    if (cleanMessage.length < 10 || cleanMessage.length > 1000) return "Góp ý cần từ 10 đến 1000 ký tự.";
    await this.pool.query("INSERT INTO feedback (id, user_id, message, created_at) VALUES ($1, $2, $3, $4)", [
      `f_${randomBytes(8).toString("hex")}`,
      userId,
      cleanMessage,
      Date.now(),
    ]);
  }

}
