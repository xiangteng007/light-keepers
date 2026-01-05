-- 同步 accounts 到 volunteers 表
-- 為現有的 accounts (role level >= 1) 自動創建 volunteers 記錄

-- 檢查並創建志工記錄
INSERT INTO volunteers (
    id,
    name,
    email,
    phone,
    region,
    skills,
    account_id,
    approval_status,
    status,
    service_hours,
    total_points,
    task_count,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    COALESCE(a.display_name, split_part(a.email, '@', 1)),  -- 使用 display_name 或 email 前綴作為姓名
    a.email,
    COALESCE(a.phone, '待填寫'),
    '待填寫',  -- 地區
    '{general}',  -- 預設技能
    a.id,
    'approved',  -- 直接設為已審核 (因為帳號已有權限)
    'available',  -- 設為可用狀態
    0,  -- 服務時數
    0,  -- 積分
    0,  -- 任務數
    NOW(),
    NOW()
FROM accounts a
INNER JOIN account_roles ar ON a.id = ar.account_id
INNER JOIN roles r ON ar.role_id = r.id
WHERE r.level >= 1  -- Level 1+ 的帳號 (volunteer, officer, director, chairman, owner)
  AND NOT EXISTS (
      SELECT 1 FROM volunteers v WHERE v.account_id = a.id
  )
GROUP BY a.id, a.display_name, a.email, a.phone;

-- 為新創建的志工生成志工編號
UPDATE volunteers
SET volunteer_code = 'LK' || EXTRACT(YEAR FROM NOW())::text || LPAD((
    SELECT COUNT(*) + 1 
    FROM volunteers v2 
    WHERE v2.volunteer_code IS NOT NULL 
    AND v2.created_at < volunteers.created_at
)::text, 4, '0')
WHERE volunteer_code IS NULL
  AND approval_status = 'approved';

-- 驗證結果
SELECT 
    'Sync completed' as status,
    COUNT(*) as total_volunteers
FROM volunteers
WHERE approval_status = 'approved';
