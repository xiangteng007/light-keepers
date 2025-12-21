-- NCDR Alerts 資料表遷移腳本
-- 執行於 Google Cloud SQL PostgreSQL

CREATE TABLE IF NOT EXISTS ncdr_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id VARCHAR(255) NOT NULL UNIQUE,
    alert_type_id INTEGER NOT NULL,
    alert_type_name VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'warning',
    source_unit VARCHAR(100),
    published_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    source_link VARCHAR(1000),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    affected_areas TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_ncdr_alerts_alert_id ON ncdr_alerts(alert_id);
CREATE INDEX IF NOT EXISTS idx_ncdr_alerts_alert_type_id ON ncdr_alerts(alert_type_id);
CREATE INDEX IF NOT EXISTS idx_ncdr_alerts_is_active ON ncdr_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_ncdr_alerts_published_at ON ncdr_alerts(published_at DESC);

-- 顯示成功訊息
SELECT 'ncdr_alerts table created successfully' AS status;
