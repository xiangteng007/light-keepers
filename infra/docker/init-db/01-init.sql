-- Light Keepers 資料庫初始化腳本
-- 此腳本會在 PostgreSQL 容器首次啟動時自動執行

-- 啟用 PostGIS 擴充
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== 帳號與權限 ==========

-- 角色表
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 帳號表
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- 帳號角色關聯
CREATE TABLE account_roles (
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    region_scope VARCHAR(20), -- 行政區代碼，限定管轄範圍
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (account_id, role_id)
);

-- ========== 志工資料 ==========

CREATE TABLE volunteer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
    skills TEXT[], -- 技能標籤
    service_regions TEXT[], -- 服務區域
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE volunteer_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volunteer_id UUID REFERENCES volunteer_profiles(id) ON DELETE CASCADE,
    task_id UUID, -- 關聯任務（後續建立）
    hours DECIMAL(5,2) NOT NULL,
    description TEXT,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- ========== 災情事件與回報 ==========

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- flood, road_blocked, trapped, etc.
    severity SMALLINT CHECK (severity BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, archived
    location GEOMETRY(POINT, 4326),
    address TEXT,
    admin_code VARCHAR(20), -- 行政區代碼
    started_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    reporter_account_id UUID REFERENCES accounts(id),
    reporter_name VARCHAR(100),
    reporter_phone VARCHAR(20),
    content TEXT NOT NULL,
    category VARCHAR(50),
    ai_tags TEXT[],
    ai_priority_score DECIMAL(3,2),
    location GEOMETRY(POINT, 4326),
    address TEXT,
    photos TEXT[], -- 照片 URL 陣列
    source VARCHAR(20) DEFAULT 'app', -- app, line, web
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== 任務管理 ==========

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority SMALLINT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'pending', -- pending, assigned, in_progress, completed, cancelled
    assigned_to UUID REFERENCES accounts(id),
    location GEOMETRY(POINT, 4326),
    address TEXT,
    due_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES accounts(id),
    action VARCHAR(50) NOT NULL, -- created, assigned, status_changed, note_added
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 物資管理 ==========

CREATE TABLE resource_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    location GEOMETRY(POINT, 4326),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    resource_item_id UUID REFERENCES resource_items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(warehouse_id, resource_item_id)
);

-- ========== NCDR 潛勢圖層 ==========

CREATE TABLE hazard_flood (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100),
    source_year INTEGER,
    admin_code VARCHAR(20),
    level SMALLINT CHECK (level BETWEEN 1 AND 5),
    depth_min_cm INTEGER,
    depth_max_cm INTEGER,
    geom GEOMETRY(MULTIPOLYGON, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hazard_slope (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100),
    source_year INTEGER,
    admin_code VARCHAR(20),
    level SMALLINT CHECK (level BETWEEN 1 AND 5),
    geom GEOMETRY(MULTIPOLYGON, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 索引 ==========

-- 空間索引
CREATE INDEX idx_events_location ON events USING GIST(location);
CREATE INDEX idx_reports_location ON reports USING GIST(location);
CREATE INDEX idx_tasks_location ON tasks USING GIST(location);
CREATE INDEX idx_hazard_flood_geom ON hazard_flood USING GIST(geom);
CREATE INDEX idx_hazard_slope_geom ON hazard_slope USING GIST(geom);

-- 一般索引
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_reports_event_id ON reports(event_id);

-- ========== 初始資料 ==========

INSERT INTO roles (name, description) VALUES
    ('admin', '系統管理員，擁有所有權限'),
    ('eoc', '指揮中心人員，可管理事件與派遣任務'),
    ('leader', '小隊長，可管理所屬志工與派遣任務'),
    ('volunteer', '一般志工，可接受並執行任務');

-- 建立測試管理員帳號（密碼: admin123，使用 bcrypt 雜湊）
INSERT INTO accounts (email, password_hash, display_name) VALUES
    ('admin@lightkeepers.local', '$2b$10$rQZ9QxKgGQLK8QN6MlZEXeJNYnVlzxGqNgZMWLkpQTJNQWLkpQTJN', '系統管理員');

-- 關聯管理員角色
INSERT INTO account_roles (account_id, role_id)
SELECT a.id, r.id FROM accounts a, roles r
WHERE a.email = 'admin@lightkeepers.local' AND r.name = 'admin';

DO $$ BEGIN RAISE NOTICE 'Light Keepers 資料庫初始化完成！'; END $$;
