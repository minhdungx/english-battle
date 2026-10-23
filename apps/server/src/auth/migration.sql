-- Apply once before deploying the Better Auth cutover.
-- Existing users keep their IDs, experience and legacy scrypt password hashes.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
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
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  last_request BIGINT NOT NULL
);
ALTER TABLE rate_limit ADD COLUMN IF NOT EXISTS id TEXT;
UPDATE rate_limit SET id = key WHERE id IS NULL;
ALTER TABLE rate_limit ALTER COLUMN id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_key_idx ON rate_limit (key);
DO $migration$
DECLARE current_primary_key TEXT;
BEGIN
  SELECT conname INTO current_primary_key
  FROM pg_constraint
  WHERE conrelid = 'rate_limit'::regclass
    AND contype = 'p'
    AND pg_get_constraintdef(oid) = 'PRIMARY KEY (key)';
  IF current_primary_key IS NOT NULL THEN
    EXECUTE format('ALTER TABLE rate_limit DROP CONSTRAINT %I', current_primary_key);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'rate_limit'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE rate_limit ADD PRIMARY KEY (id);
  END IF;
END $migration$;

-- Existing accounts were already usable before email verification existed.
UPDATE users SET email_verified = TRUE WHERE email_verified IS FALSE;

-- Invalidate old bearer sessions at cutover. Users sign in again through Better Auth.
DO $migration$
BEGIN
  IF to_regclass('sessions') IS NOT NULL THEN
    TRUNCATE TABLE sessions;
  END IF;
END $migration$;

-- Preserve legacy password hashes in Better Auth credential accounts.
INSERT INTO auth_accounts (
  id, account_id, provider_id, user_id, password, created_at, updated_at
)
SELECT
  'legacy_' || id, id, 'credential', id, password_hash, created_at, NOW()
FROM users
WHERE password_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth_accounts a WHERE a.provider_id = 'credential' AND a.account_id = users.id
  );
