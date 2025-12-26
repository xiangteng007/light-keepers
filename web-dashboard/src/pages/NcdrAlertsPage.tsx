import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Button } from '../design-system';
import {
    getNcdrAlerts,
    getNcdrAlertStats,
    syncNcdrAlerts,
    broadcastNcdrAlert,
    getLineBotStats,
    type NcdrAlert,
} from '../api';
import { useAuth } from '../context/AuthContext';

// 類別定義 (前端靜態，避免每次請求)
const ALERT_TYPE_DEFINITIONS = [
    // 中央部會 - 核心
    { id: 33, name: '地震', sourceUnit: '中央氣象署', category: 'central' as const, priority: 'core' as const },
    { id: 34, name: '海嘯', sourceUnit: '中央氣象署', category: 'central' as const, priority: 'core' as const },
    { id: 5, name: '颱風', sourceUnit: '中央氣象署', category: 'central' as const, priority: 'core' as const },
    { id: 6, name: '雷雨', sourceUnit: '中央氣象署', category: 'central' as const, priority: 'core' as const },
    { id: 37, name: '降雨', sourceUnit: '中央氣象署', category: 'central' as const, priority: 'core' as const },
    { id: 38, name: '土石流', sourceUnit: '農業部', category: 'central' as const, priority: 'core' as const },
    { id: 53, name: '火災', sourceUnit: '內政部消防署', category: 'central' as const, priority: 'core' as const },
    // 中央部會 - 擴展
    { id: 14, name: '低溫', sourceUnit: '中央氣象署', category: 'central' as const, priority: 'extended' as const },
    { id: 32, name: '強風', sourceUnit: '中央氣象署', category: 'central' as const, priority: 'extended' as const },
    { id: 56, name: '高溫', sourceUnit: '中央氣象署', category: 'central' as const, priority: 'extended' as const },
    { id: 7, name: '淹水', sourceUnit: '水利署', category: 'central' as const, priority: 'extended' as const },
    { id: 43, name: '水庫放流', sourceUnit: '水利署', category: 'central' as const, priority: 'extended' as const },
    { id: 3, name: '道路封閉', sourceUnit: '交通部公路局', category: 'central' as const, priority: 'extended' as const },
    { id: 62, name: '防空', sourceUnit: '內政部', category: 'central' as const, priority: 'extended' as const },
    { id: 47, name: '停班停課', sourceUnit: '行政院', category: 'central' as const, priority: 'extended' as const },
    // 事業單位
    { id: 35, name: '鐵路事故', sourceUnit: '臺鐵公司', category: 'enterprise' as const, priority: 'extended' as const },
    { id: 51, name: '鐵路事故(高鐵)', sourceUnit: '台灣高鐵', category: 'enterprise' as const, priority: 'extended' as const },
    { id: 65, name: '捷運營運', sourceUnit: '各捷運公司', category: 'enterprise' as const, priority: 'extended' as const },
    { id: 44, name: '停水', sourceUnit: '自來水公司', category: 'enterprise' as const, priority: 'extended' as const },
    { id: 61, name: '電力', sourceUnit: '台灣電力公司', category: 'enterprise' as const, priority: 'extended' as const },
    // 地方政府
    { id: 45, name: '水位警戒', sourceUnit: '地方政府', category: 'local' as const, priority: 'extended' as const },
    { id: 19, name: '道路施工', sourceUnit: '地方政府', category: 'local' as const, priority: 'extended' as const },
];

const CORE_TYPE_IDS = [33, 34, 5, 6, 37, 38, 53];

const STORAGE_KEY = 'ncdr_selected_types';

// 獲取儲存的偏好
const getStoredTypes = (): number[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : CORE_TYPE_IDS;
    } catch {
        return CORE_TYPE_IDS;
    }
};

// 儲存偏好
const saveStoredTypes = (types: number[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
};

// 嚴重程度顏色
const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'critical': return '#B85C5C';
        case 'warning': return '#C9A256';
        default: return '#5C7B8E';
    }
};

const getSeverityLabel = (severity: string) => {
    switch (severity) {
        case 'critical': return '危急';
        case 'warning': return '警戒';
        default: return '注意';
    }
};

export default function NcdrAlertsPage() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [selectedTypes, setSelectedTypes] = useState<number[]>(getStoredTypes);
    const [showFilter, setShowFilter] = useState(false);
    const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string } | null>(null);

    // 是否為管理員（幹部以上）
    const isAdmin = (user?.roleLevel ?? 0) >= 2;

    // 同步選擇到 localStorage
    useEffect(() => {
        saveStoredTypes(selectedTypes);
    }, [selectedTypes]);

    // 獲取警報列表
    const { data: alertsData, isLoading } = useQuery({
        queryKey: ['ncdrAlerts', selectedTypes],
        queryFn: () => getNcdrAlerts({
            types: selectedTypes.join(','),
            activeOnly: true,
            limit: 100,
        }).then(res => res.data.data),
        enabled: selectedTypes.length > 0,
    });

    // 獲取統計
    const { data: statsData } = useQuery({
        queryKey: ['ncdrStats'],
        queryFn: () => getNcdrAlertStats().then(res => res.data.data),
    });

    // 獲取 LINE BOT 統計
    const { data: lineBotStats } = useQuery({
        queryKey: ['lineBotStats'],
        queryFn: () => getLineBotStats().then(res => res.data.data),
        enabled: isAdmin,
    });

    // 同步 mutation
    const syncMutation = useMutation({
        mutationFn: syncNcdrAlerts,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ncdrAlerts'] });
            queryClient.invalidateQueries({ queryKey: ['ncdrStats'] });
        },
    });

    // LINE 推播 mutation
    const broadcastMutation = useMutation({
        mutationFn: (data: { title: string; description: string; severity: 'critical' | 'warning' | 'info'; affectedAreas?: string }) =>
            broadcastNcdrAlert(data),
        onSuccess: (response) => {
            setBroadcastResult({
                success: response.data.success,
                message: response.data.message,
            });
        },
        onError: () => {
            setBroadcastResult({
                success: false,
                message: '推播失敗，請稍後再試',
            });
        },
    });

    const alerts = alertsData || [];

    // 類別分組
    const centralTypes = ALERT_TYPE_DEFINITIONS.filter(t => t.category === 'central');
    const enterpriseTypes = ALERT_TYPE_DEFINITIONS.filter(t => t.category === 'enterprise');
    const localTypes = ALERT_TYPE_DEFINITIONS.filter(t => t.category === 'local');

    const toggleType = (id: number) => {
        setSelectedTypes(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const selectAll = () => setSelectedTypes(ALERT_TYPE_DEFINITIONS.map(t => t.id));
    const selectNone = () => setSelectedTypes([]);
    const selectCore = () => setSelectedTypes(CORE_TYPE_IDS);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 執行 LINE 推播
    const handleBroadcast = (alert: NcdrAlert) => {
        broadcastMutation.mutate({
            title: alert.title,
            description: alert.description || '',
            severity: alert.severity as 'critical' | 'warning' | 'info',
            affectedAreas: alert.sourceUnit,
        });
    };


    return (
        <div className="page ncdr-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>🚨 災害示警</h2>
                    <Badge variant="warning">{alerts.length} 則警報</Badge>
                </div>
                <div className="page-header__actions">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowFilter(!showFilter)}
                    >
                        🔧 篩選類別 ({selectedTypes.length})
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        loading={syncMutation.isPending}
                        onClick={() => syncMutation.mutate()}
                    >
                        🔄 同步
                    </Button>
                </div>
            </div>

            {/* 類別篩選器 */}
            {showFilter && (
                <Card className="ncdr-filter">
                    <div className="ncdr-filter__header">
                        <h4>選擇示警類別</h4>
                        <div className="ncdr-filter__actions">
                            <button onClick={selectCore}>僅核心</button>
                            <button onClick={selectAll}>全選</button>
                            <button onClick={selectNone}>全不選</button>
                        </div>
                    </div>

                    <div className="ncdr-filter__groups">
                        <div className="ncdr-filter__group">
                            <h5>🏛️ 中央部會</h5>
                            <div className="ncdr-filter__items">
                                {centralTypes.map(type => (
                                    <label key={type.id} className="ncdr-filter__item">
                                        <input
                                            type="checkbox"
                                            checked={selectedTypes.includes(type.id)}
                                            onChange={() => toggleType(type.id)}
                                        />
                                        <span className={type.priority === 'core' ? 'core' : ''}>
                                            {type.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="ncdr-filter__group">
                            <h5>🏢 事業單位</h5>
                            <div className="ncdr-filter__items">
                                {enterpriseTypes.map(type => (
                                    <label key={type.id} className="ncdr-filter__item">
                                        <input
                                            type="checkbox"
                                            checked={selectedTypes.includes(type.id)}
                                            onChange={() => toggleType(type.id)}
                                        />
                                        <span>{type.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="ncdr-filter__group">
                            <h5>🏘️ 地方政府</h5>
                            <div className="ncdr-filter__items">
                                {localTypes.map(type => (
                                    <label key={type.id} className="ncdr-filter__item">
                                        <input
                                            type="checkbox"
                                            checked={selectedTypes.includes(type.id)}
                                            onChange={() => toggleType(type.id)}
                                        />
                                        <span>{type.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="ncdr-filter__footer">
                        <p>⚡ 核心類別 (預設載入): 地震、海嘯、颱風、雷雨、降雨、土石流、火災</p>
                        {statsData?.lastSyncTime && (
                            <p>📅 上次同步: {formatTime(statsData.lastSyncTime)}</p>
                        )}
                    </div>
                </Card>
            )}

            {/* 警報列表 */}
            <div className="ncdr-alerts-grid">
                {isLoading && <div className="loading">載入中...</div>}

                {!isLoading && alerts.length === 0 && (
                    <Card className="ncdr-empty">
                        <div className="empty-state">
                            <span>✅</span>
                            <h3>目前無災害警報</h3>
                            <p>已選擇 {selectedTypes.length} 個類別進行監控</p>
                        </div>
                    </Card>
                )}

                {alerts.map((alert: NcdrAlert) => (
                    <Card key={alert.id} className="ncdr-alert-card" hoverable>
                        <div className="ncdr-alert__header">
                            <Badge
                                variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}
                            >
                                {alert.alertTypeName}
                            </Badge>
                            <span
                                className="ncdr-alert__severity"
                                style={{ color: getSeverityColor(alert.severity) }}
                            >
                                {getSeverityLabel(alert.severity)}
                            </span>
                        </div>
                        <h4 className="ncdr-alert__title">{alert.title}</h4>
                        {alert.description && (
                            <p className="ncdr-alert__desc">{alert.description}</p>
                        )}
                        <div className="ncdr-alert__meta">
                            <span>📢 {alert.sourceUnit}</span>
                            <span>🕐 {formatTime(alert.publishedAt)}</span>
                        </div>
                        {alert.sourceLink && (
                            <a
                                href={alert.sourceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ncdr-alert__link"
                            >
                                查看詳情 →
                            </a>
                        )}
                        {/* 管理員推播按鈕 */}
                        {isAdmin && lineBotStats?.botEnabled && (
                            <div className="ncdr-alert__actions" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleBroadcast(alert)}
                                    loading={broadcastMutation.isPending}
                                >
                                    📱 LINE 推播 ({lineBotStats.boundUserCount} 人)
                                </Button>
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {/* 推播結果提示 */}
            {broadcastResult && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '2rem',
                        right: '2rem',
                        padding: '1rem 1.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: broadcastResult.success ? 'var(--color-success)' : 'var(--color-danger)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        zIndex: 1000,
                    }}
                    onClick={() => setBroadcastResult(null)}
                >
                    {broadcastResult.success ? '✅' : '❌'} {broadcastResult.message}
                </div>
            )}
        </div>
    );
}

