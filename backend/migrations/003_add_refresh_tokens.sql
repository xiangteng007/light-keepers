-- Migration: Add refresh_tokens table
-- Date: 2026-01-02
-- Description: Secure refresh token storage for JWT token rotation

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_account ON refresh_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Cleanup old/revoked tokens (should be run periodically)
COMMENT ON TABLE refresh_tokens IS 'Stores hashed refresh tokens for secure JWT rotation';
