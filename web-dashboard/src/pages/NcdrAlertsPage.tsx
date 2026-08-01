import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Card, Badge, Button, ToastContainer } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton/Skeleton';
import {
    getNcdrAlerts,
    getNcdrAlertStats,
    syncNcdrAlerts,
    broadcastNcdrAlert,
    getLineBotStats,
    type NcdrAlert,
} from '../api';
import { useAuth } from '../context/AuthContext';

// 類別定義 - 使用正確的 NCDR AlertType IDs
// 來源: https://alerts.ncdr.nat.gov.tw/RSS.aspx
// 完整 61 個示警類型
const ALERT_TYPE_DEFINITIONS = [
    // ============ 中央部會 (40 個) ============
    { id: 5, name: '颱風', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 6, name: '地震', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 7, name: '海嘯', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 8, name: '淹水', sourceUnit: '水利署', category: 'central' as const },
    { id: 9, name: '土石流及大規模崩塌', sourceUnit: '農業部', category: 'central' as const },
    { id: 10, name: '降雨', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 11, name: '河川高水位', sourceUnit: '水利署', category: 'central' as const },
    { id: 12, name: '水庫放流', sourceUnit: '水利署', category: 'central' as const },
    { id: 13, name: '道路封閉', sourceUnit: '交通部公路局', category: 'central' as const },
    { id: 33, name: '停班停課', sourceUnit: '行政院', category: 'central' as const },
    { id: 1047, name: '防空', sourceUnit: '內政部警政署', category: 'central' as const },
    { id: 1051, name: '雷雨', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 1053, name: '傳染病', sourceUnit: '疾病管制署', category: 'central' as const },
    { id: 1060, name: '低溫', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 1061, name: '強風', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 1062, name: '濃霧', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 1075, name: '市話通訊中斷', sourceUnit: 'NCC', category: 'central' as const },
    { id: 1076, name: '行動電話中斷', sourceUnit: 'NCC', category: 'central' as const },
    { id: 1078, name: '空氣品質', sourceUnit: '環境部', category: 'central' as const },
    { id: 1087, name: '火災', sourceUnit: '內政部消防署', category: 'central' as const },
    { id: 1093, name: '林火危險度預警', sourceUnit: '農業部林業署', category: 'central' as const },
    { id: 2098, name: '分洪警報', sourceUnit: '水利署', category: 'central' as const },
    { id: 2099, name: '枯旱預警', sourceUnit: '水利署', category: 'central' as const },
    { id: 2102, name: '疏散避難', sourceUnit: '內政部消防署', category: 'central' as const },
    { id: 2104, name: '輻射災害', sourceUnit: '核安會', category: 'central' as const },
    { id: 2107, name: '高溫', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 2108, name: '火山', sourceUnit: '中央氣象署', category: 'central' as const },
    { id: 2115, name: '交流道淹水', sourceUnit: '高速公路局', category: 'central' as const },
    { id: 2116, name: '強風管制路段', sourceUnit: '高速公路局', category: 'central' as const },
    { id: 2118, name: '海洋污染', sourceUnit: '海洋保育署', category: 'central' as const },
    { id: 2119, name: '海灘水質', sourceUnit: '海洋保育署', category: 'central' as const },
    { id: 2121, name: '鐵路事故(阿里山)', sourceUnit: '阿里山林鐵', category: 'central' as const },
    { id: 2142, name: '急門診通報', sourceUnit: '衛生福利部', category: 'central' as const },
    { id: 2158, name: '消防不合格場所', sourceUnit: '內政部消防署', category: 'central' as const },
    { id: 3153, name: '高速公路路況', sourceUnit: '高速公路局', category: 'central' as const },
    { id: 100013, name: '濃霧(日月潭)', sourceUnit: '觀光署', category: 'central' as const },
    { id: 100014, name: '堰塞湖警戒', sourceUnit: '農業部林業署', category: 'central' as const },
    { id: 100018, name: '國家公園入園示警', sourceUnit: '營建署', category: 'central' as const },
    { id: 104048, name: '國家森林遊樂區', sourceUnit: '農業部林業署', category: 'central' as const },
    { id: 104051, name: '淹水感測', sourceUnit: '水利署', category: 'central' as const },

    // ============ 事業單位 (10 個) ============
    { id: 32, name: '鐵路事故(高鐵)', sourceUnit: '台灣高速鐵路', category: 'enterprise' as const },
    { id: 34, name: '鐵路事故(臺鐵)', sourceUnit: '臺鐵公司', category: 'enterprise' as const },
    { id: 1080, name: '電力中斷', sourceUnit: '台灣電力公司', category: 'enterprise' as const },
    { id: 1085, name: '停水(臺北)', sourceUnit: '臺北自來水', category: 'enterprise' as const },
    { id: 1089, name: '停水(台水)', sourceUnit: '台灣自來水', category: 'enterprise' as const },
    { id: 2134, name: '捷運營運(臺中)', sourceUnit: '臺中捷運', category: 'enterprise' as const },
    { id: 2135, name: '捷運營運(臺北)', sourceUnit: '臺北捷運', category: 'enterprise' as const },
    { id: 2139, name: '捷運營運(高雄)', sourceUnit: '高雄捷運', category: 'enterprise' as const },
    { id: 2141, name: '捷運營運(新北)', sourceUnit: '新北捷運', category: 'enterprise' as const },
    { id: 100016, name: '捷運營運(桃園)', sourceUnit: '桃園捷運', category: 'enterprise' as const },

    // ============ 地方政府 (11 個) ============
    { id: 1057, name: '開放路邊停車', sourceUnit: '臺北市政府', category: 'local' as const },
    { id: 1059, name: '水門資訊', sourceUnit: '臺北市政府', category: 'local' as const },
    { id: 1066, name: '水位警戒', sourceUnit: '臺中市水利局', category: 'local' as const },
    { id: 1091, name: '水位警示', sourceUnit: '桃園市政府', category: 'local' as const },
    { id: 2101, name: '區排警戒', sourceUnit: '臺南市政府', category: 'local' as const },
    { id: 2109, name: '道路施工', sourceUnit: '臺中市政府', category: 'local' as const },
    { id: 2112, name: '道路施工', sourceUnit: '臺北市政府', category: 'local' as const },
    { id: 4153, name: '開放路邊停車', sourceUnit: '新北市政府', category: 'local' as const },
    { id: 100003, name: '開放臨時停車', sourceUnit: '高雄市政府', category: 'local' as const },
    { id: 100005, name: '水門資訊', sourceUnit: '新北市政府', category: 'local' as const },
    { id: 100020, name: '地下道積淹水', sourceUnit: '新竹市消防局', category: 'local' as const },
];

// 核心類別 (預設載入) - 主要自然災害警報
const CORE_TYPE_IDS = [5, 6, 7, 8, 9, 10, 11, 12, 1051, 1060, 1061, 1062, 1087, 2107, 33];

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

// 嚴重程度 → design-system Badge variant（§3 狀態色語意：危急=danger、警戒=warning、其餘=info）
const getSeverityBadgeVariant = (severity: string): 'danger' | 'warning' | 'info' => {
    switch (severity) {
        case 'critical': return 'danger';
        case 'warning': return 'warning';
        default: return 'info';
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
                    <h1>災害示警</h1>
                    <Badge variant="warning">{alerts.length} 則警報</Badge>
                </div>
                <div className="page-header__actions">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowFilter(!showFilter)}
                    >
                        篩選類別 ({selectedTypes.length})
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        loading={syncMutation.isPending}
                        onClick={() => syncMutation.mutate()}
                    >
                        同步
                    </Button>
                </div>
            </div>

            {/* 類別篩選器 */}
            {showFilter && (
                <Card className="ncdr-filter">
                    <div className="ncdr-filter__header">
                        <h4>選擇示警類別</h4>
                        <div className="ncdr-filter__actions">
                            <Button variant="ghost" size="sm" onClick={selectCore}>僅核心</Button>
                            <Button variant="ghost" size="sm" onClick={selectAll}>全選</Button>
                            <Button variant="ghost" size="sm" onClick={selectNone}>全不選</Button>
                        </div>
                    </div>

                    <div className="ncdr-filter__groups">
                        <div className="ncdr-filter__group">
                            <h5>中央部會</h5>
                            <div className="ncdr-filter__items">
                                {centralTypes.map(type => (
                                    <label key={type.id} className="ncdr-filter__item">
                                        <input
                                            type="checkbox"
                                            checked={selectedTypes.includes(type.id)}
                                            onChange={() => toggleType(type.id)}
                                        />
                                        <span className={CORE_TYPE_IDS.includes(type.id) ? 'core' : ''}>
                                            {type.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="ncdr-filter__group">
                            <h5>事業單位</h5>
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
                            <h5>地方政府</h5>
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
                        <p>核心類別 (預設載入): 颱風、地震、海嘯、淹水、土石流、降雨、雷雨、低溫、高溫、強風、濃霧、火災</p>
                        {statsData?.lastSyncTime && (
                            <p>上次同步: {formatTime(statsData.lastSyncTime)}</p>
                        )}
                    </div>
                </Card>
            )}

            {/* 警報列表 */}
            {isLoading ? (
                <div className="ncdr-alerts-grid" aria-busy="true" aria-label="警報載入中">
                    <SkeletonCard descriptionLines={2} showImage={false} />
                    <SkeletonCard descriptionLines={2} showImage={false} />
                    <SkeletonCard descriptionLines={2} showImage={false} />
                </div>
            ) : alerts.length === 0 ? (
                <EmptyState
                    icon={ShieldAlert}
                    variant="default"
                    title="目前無災害警報"
                    description={`已選擇 ${selectedTypes.length} 個類別進行監控`}
                />
            ) : (
                <div className="ncdr-alerts-grid">
                    {alerts.map((alert: NcdrAlert) => (
                        <Card key={alert.id} className="ncdr-alert-card" hoverable>
                            <div className="ncdr-alert__header">
                                <Badge variant={getSeverityBadgeVariant(alert.severity)} dot>
                                    {getSeverityLabel(alert.severity)}
                                </Badge>
                                <span className="ncdr-alert__type">{alert.alertTypeName}</span>
                            </div>
                            <h4 className="ncdr-alert__title">{alert.title}</h4>
                            {alert.description && (
                                <p className="ncdr-alert__desc">{alert.description}</p>
                            )}
                            <div className="ncdr-alert__meta">
                                <span>{alert.sourceUnit}</span>
                                <span className="ncdr-alert__time">{formatTime(alert.publishedAt)}</span>
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
                                <div className="ncdr-alert__actions">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleBroadcast(alert)}
                                        loading={broadcastMutation.isPending}
                                    >
                                        LINE 推播 ({lineBotStats.boundUserCount} 人)
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* 推播結果提示 */}
            <ToastContainer
                position="bottom-right"
                toasts={broadcastResult ? [{
                    id: 'ncdr-broadcast-result',
                    variant: broadcastResult.success ? 'success' : 'danger',
                    message: broadcastResult.message,
                    onClose: () => setBroadcastResult(null),
                }] : []}
                onClose={() => setBroadcastResult(null)}
            />
        </div>
    );
}
