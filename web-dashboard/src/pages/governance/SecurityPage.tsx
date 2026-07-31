/**
 * SecurityPage
 * Security center with anomaly detection
 *
 * FE-4/3.3: 後端無對應「登入異常偵測」API。`backend/src/modules/staff-security` 名稱相近但功能
 * 是人員實體安全（事件通報/簽到/疏散計畫），與本頁的登入異常警報（暴力破解/不可能移動等）是
 * 不同領域，不可誤接。本頁仍顯示寫死示範資料，並以 banner 標示。待 Phase 4/5 評估是否新增
 * 對應後端模組。
 */
import { useState } from 'react';
import { Alert } from '../../design-system';
import './SecurityPage.css';

interface AnomalyAlert {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: Date;
    accountId: string;
    resolved: boolean;
}

const mockAlerts: AnomalyAlert[] = [
    { id: '1', type: 'BRUTE_FORCE', severity: 'high', description: '疑似暴力破解攻擊：10 次失敗登入嘗試', timestamp: new Date(Date.now() - 3600000), accountId: 'user123', resolved: false },
    { id: '2', type: 'IMPOSSIBLE_TRAVEL', severity: 'critical', description: '不可能的移動：在 1 小時內從台北到東京', timestamp: new Date(Date.now() - 7200000), accountId: 'admin01', resolved: false },
    { id: '3', type: 'UNUSUAL_TIME', severity: 'low', description: '異常時間登入：03:42', timestamp: new Date(Date.now() - 86400000), accountId: 'volunteer01', resolved: true },
    { id: '4', type: 'HIGH_FREQUENCY', severity: 'medium', description: '異常高頻率請求：250 次/分鐘', timestamp: new Date(Date.now() - 1800000), accountId: 'api-service', resolved: false },
];

export default function SecurityPage() {
    const [alerts, setAlerts] = useState(mockAlerts);
    const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

    const resolveAlert = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    };

    const filteredAlerts = alerts.filter(a => filter === 'all' || !a.resolved);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#9333EA';
            case 'high': return '#EF4444';
            case 'medium': return '#F59E0B';
            default: return '#3B82F6';
        }
    };

    return (
        <div className="security-page">
            <header className="security-page__header">
                <div>
                    <h1>🛡️ 安全中心</h1>
                    <p>異常行為偵測與安全監控</p>
                </div>
                <div className="security-page__stats">
                    <div className="stat-card">
                        <span className="stat-value">{alerts.filter(a => !a.resolved).length}</span>
                        <span className="stat-label">待處理</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{alerts.filter(a => a.severity === 'critical').length}</span>
                        <span className="stat-label">嚴重</span>
                    </div>
                </div>
            </header>

            <Alert variant="warning" title="示範資料">
                此頁目前顯示示範資料，功能建置中。後端尚未提供登入異常偵測 API。
            </Alert>

            <div className="security-page__controls">
                <button
                    className={filter === 'unresolved' ? 'active' : ''}
                    onClick={() => setFilter('unresolved')}
                >
                    待處理
                </button>
                <button
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    全部
                </button>
            </div>

            <div className="security-page__alerts">
                {filteredAlerts.length === 0 ? (
                    <div className="empty-state">
                        <span>✅</span>
                        <p>目前沒有待處理的安全警報</p>
                    </div>
                ) : (
                    filteredAlerts.map(alert => (
                        <div key={alert.id} className={`alert-card ${alert.resolved ? 'resolved' : ''}`}>
                            <div
                                className="alert-card__severity"
                                style={{ backgroundColor: getSeverityColor(alert.severity) }}
                            />
                            <div className="alert-card__content">
                                <div className="alert-card__header">
                                    <span className="alert-type">{alert.type}</span>
                                    <span className="alert-time">
                                        {alert.timestamp.toLocaleString('zh-TW')}
                                    </span>
                                </div>
                                <p className="alert-desc">{alert.description}</p>
                                <span className="alert-account">帳號: {alert.accountId}</span>
                            </div>
                            {!alert.resolved && (
                                <button
                                    className="resolve-btn"
                                    onClick={() => resolveAlert(alert.id)}
                                >
                                    解決
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
