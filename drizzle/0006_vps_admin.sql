ALTER TABLE auth_accounts ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;
CREATE TABLE admin_audit(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),target_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,details TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX admin_audit_time ON admin_audit(created_at);
