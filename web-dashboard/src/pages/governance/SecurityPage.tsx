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
import { ShieldIcon, CheckIcon, WarningIcon } from '../../design-system/icons';
import { Alert, Badge, Button, StatIndicator } from '../../design-system';
import EmptyState from '../../components/shared/EmptyState';
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

// 嚴重度 → Badge variant 對照。critical/high 都映射到 danger（Badge 元件無獨立 critical
// variant，§3 的「大規模危機」token 保留給 EmergencyStatusBar），medium 用 warning，
// low 用 info——語意仍嚴格對應，不是裝飾用色。
const SEVERITY_BADGE_VARIANT: Record<AnomalyAlert['severity'], 'danger' | 'warning' | 'info'> = {
    critical: 'danger',
    high: 'danger',
    medium: 'warning',
    low: 'info',
};

const SEVERITY_LABEL: Record<AnomalyAlert['severity'], string> = {
    critical: '嚴重',
    high: '高',
    medium: '中',
    low: '低',
};

export default function SecurityPage() {
    const [alerts, setAlerts] = useState(mockAlerts);
    const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

    const resolveAlert = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    };

    const filteredAlerts = alerts.filter(a => filter === 'all' || !a.resolved);

    return (
        <div className="security-page">
            <div className="page-header">
                <div className="page-header__text">
                    <h1><ShieldIcon size={24} aria-hidden="true" /> 安全中心</h1>
                    <p>異常行為偵測與安全監控</p>
                </div>
                <div className="security-page__stats">
                    <StatIndicator
                        value={alerts.filter(a => !a.resolved).length}
                        label="待處理"
                        variant="warning"
                    />
                    <StatIndicator
                        value={alerts.filter(a => a.severity === 'critical').length}
                        label="嚴重"
                        variant="danger"
                    />
                </div>
            </div>

            <Alert variant="warning" title="示範資料">
                此頁目前顯示示範資料，功能建置中。後端尚未提供登入異常偵測 API。
            </Alert>

            <div className="security-page__controls" role="group" aria-label="篩選警報">
                <Button
                    size="sm"
                    variant={filter === 'unresolved' ? 'primary' : 'secondary'}
                    onClick={() => setFilter('unresolved')}
                    aria-pressed={filter === 'unresolved'}
                >
                    待處理
                </Button>
                <Button
                    size="sm"
                    variant={filter === 'all' ? 'primary' : 'secondary'}
                    onClick={() => setFilter('all')}
                    aria-pressed={filter === 'all'}
                >
                    全部
                </Button>
            </div>

            <div className="security-page__alerts">
                {filteredAlerts.length === 0 ? (
                    <EmptyState
                        icon={CheckIcon}
                        title="目前沒有待處理的安全警報"
                        description="所有已知的登入異常都已處理完畢。"
                    />
                ) : (
                    filteredAlerts.map(alert => (
                        <div key={alert.id} className={`alert-card ${alert.resolved ? 'resolved' : ''}`}>
                            <div className="alert-card__content">
                                <div className="alert-card__header">
                                    <div className="alert-card__header-left">
                                        <Badge
                                            variant={SEVERITY_BADGE_VARIANT[alert.severity]}
                                            size="sm"
                                            icon={<WarningIcon size={12} aria-hidden="true" />}
                                        >
                                            {SEVERITY_LABEL[alert.severity]}
                                        </Badge>
                                        <span className="alert-type">{alert.type}</span>
                                    </div>
                                    <span className="alert-time">
                                        {alert.timestamp.toLocaleString('zh-TW')}
                                    </span>
                                </div>
                                <p className="alert-desc">{alert.description}</p>
                                <span className="alert-account">帳號: {alert.accountId}</span>
                            </div>
                            {!alert.resolved && (
                                <Button size="sm" variant="secondary" onClick={() => resolveAlert(alert.id)}>
                                    標記已解決
                                </Button>
                            )}
                            {alert.resolved && (
                                <Badge variant="success" size="sm" icon={<CheckIcon size={12} aria-hidden="true" />}>
                                    已解決
                                </Badge>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
