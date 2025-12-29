-- Database Migration: Add source tracking fields to reports table
-- Created: 2025-12-29
-- Purpose: Enable tracking of report sources (LINE Bot vs Web) and LINE user information

-- Add source column with default 'web'
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'web';

-- Add LINE user tracking columns
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS reporter_line_user_id VARCHAR(50);

ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS reporter_line_display_name VARCHAR(100);

-- Update existing records to have 'web' as source (if previously NULL)
UPDATE reports 
SET source = 'web' 
WHERE source IS NULL;

-- Add index for source filtering
CREATE INDEX IF NOT EXISTS idx_reports_source ON reports(source);

-- Add index for LINE user lookup
CREATE INDEX IF NOT EXISTS idx_reports_line_user_id ON reports(reporter_line_user_id);

-- Verify migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND column_name IN ('source', 'reporter_line_user_id', 'reporter_line_display_name')
ORDER BY column_name;
