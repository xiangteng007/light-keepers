-- Volunteer-Account 關聯 Migration
-- 執行此 SQL 來添加外鍵約束和同步權限

-- Step 1: 添加外鍵約束
DO $$
BEGIN
    -- 檢查外鍵是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_volunteers_account'
    ) THEN
        ALTER TABLE volunteers 
        ADD CONSTRAINT FK_volunteers_account 
        FOREIGN KEY (account_id) 
        REFERENCES accounts(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'FK_volunteers_account created successfully';
    ELSE
        RAISE NOTICE 'FK_volunteers_account already exists, skipping...';
    END IF;
END $$;

-- Step 2: 為現有已審核志工自動分配 volunteer role
WITH approved_volunteers AS (
    SELECT account_id 
    FROM volunteers 
    WHERE approval_status = 'approved' 
    AND account_id IS NOT NULL
)
INSERT INTO account_roles (account_id, role_id)
SELECT av.account_id, r.id
FROM approved_volunteers av
CROSS JOIN roles r
WHERE r.name = 'volunteer'
ON CONFLICT DO NOTHING;

-- Verification: 顯示已同步的志工數量
SELECT 
    'Migration completed' as status,
    COUNT(*) as synced_volunteers
FROM volunteers v
INNER JOIN accounts a ON v.account_id = a.id
INNER JOIN account_roles ar ON a.id = ar.account_id
INNER JOIN roles r ON ar.role_id = r.id
WHERE v.approval_status = 'approved'
AND r.name = 'volunteer';
