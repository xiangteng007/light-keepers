-- Migration: Add FCM tokens column to accounts table
-- Date: 2026-01-02
-- Description: Support for Firebase Cloud Messaging push notifications

-- Add fcm_tokens column (PostgreSQL array type)
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS fcm_tokens text[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN accounts.fcm_tokens IS 'Firebase Cloud Messaging device tokens for push notifications';
