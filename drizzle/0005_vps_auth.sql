CREATE TABLE auth_accounts(user_id TEXT PRIMARY KEY REFERENCES users(id),password_hash TEXT NOT NULL,must_change INTEGER NOT NULL DEFAULT 1);
CREATE TABLE auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE INDEX auth_session_expiry ON auth_sessions(expires_at);
CREATE TABLE auth_attempts(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,window_start INTEGER NOT NULL);
