/**
 * MapSidebar — 地圖側欄（R2b 自 MapPage 抽出）
 *
 * DESIGN_LANGUAGE §7.4：桌機為右側詳情側欄（選取物件時行動卡置頂）；
 * 行動端由 CSS 轉為地圖下方的 bottom sheet 區塊。
 *
 * 內容：
 * 1. 行動卡（有選取時）：通報詳情 + 快速行動（導航／建立任務派遣捷徑）
 * 2. 清單 Tabs：災害回報／NCDR 示警（各自帶篩選）
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Compass, ExternalLink, MapPin, X } from 'lucide-react';
import { Badge, Button, Card } from '../../design-system';
import type { Event, NcdrAlert } from '../../api';
import { NCDR_CORE_TYPES, NCDR_EXTENDED_TYPES } from '../map-constants';
import { getSeverityColor, getSeverityLabel, formatRelativeTime } from '../map-utils';
import { openDirections, type MapSelection } from './types';

export interface MapSidebarProps {
    events: Event[];
    isLoadingEvents: boolean;
    /** 已過圖層層級過濾的 NCDR 清單（與地圖標記一致） */
    ncdrAlerts: NcdrAlert[];
    selection: MapSelection | null;
    onSelectEvent: (event: Event) => void;
    onSelectNcdr: (alert: NcdrAlert) => void;
    onClearSelection: () => void;
}

export default function MapSidebar({
    events,
    isLoadingEvents,
    ncdrAlerts,
    selection,
    onSelectEvent,
    onSelectNcdr,
    onClearSelection,
}: MapSidebarProps) {
    const navigate = useNavigate();
    const [tab, setTab] = useState<'events' | 'ncdr'>('events');

    // 事件篩選（清單內部狀態）
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    // NCDR 篩選
    const [ncdrTypeFilter, setNcdrTypeFilter] = useState('all');
    const [ncdrSeverityFilter, setNcdrSeverityFilter] = useState('all');

    const categories = useMemo(
        () => [...new Set(events.map(e => e.category || '其他').filter(Boolean))],
        [events],
    );

    const filteredEvents = useMemo(() => events.filter(e => {
        const matchCategory = categoryFilter === 'all' || (e.category || '其他') === categoryFilter;
        const sev = e.severity || 0;
        const matchSeverity = severityFilter === 'all'
            || (severityFilter === '5' && sev >= 5)
            || (severityFilter === '4' && sev === 4)
            || (severityFilter === '3' && sev === 3)
            || (severityFilter === '2' && sev === 2)
            || (severityFilter === '1' && sev <= 1);
        return matchCategory && matchSeverity;
    }), [events, categoryFilter, severityFilter]);

    const filteredNcdr = useMemo(() => {
        let result = ncdrAlerts;
        if (ncdrTypeFilter !== 'all') {
            const typeId = parseInt(ncdrTypeFilter, 10);
            result = result.filter(a => a.alertTypeId === typeId);
        }
        if (ncdrSeverityFilter !== 'all') {
            result = result.filter(a => a.severity === ncdrSeverityFilter);
        }
        return result;
    }, [ncdrAlerts, ncdrTypeFilter, ncdrSeverityFilter]);

    return (
        <aside className="map-sidebar" aria-label="地圖清單與詳情">
            {/* ===== 行動卡（選取物件時置頂） ===== */}
            {selection && (
                <Card padding="md" className="map-action-card">
                    <ActionCard
                        selection={selection}
                        onClear={onClearSelection}
                        onCreateTask={() => navigate('/tasks')}
                    />
                </Card>
            )}

            <Card padding="sm">
                <div className="sidebar-tabs">
                    <button
                        className={`sidebar-tab ${tab === 'events' ? 'sidebar-tab--active' : ''}`}
                        onClick={() => setTab('events')}
                    >
                        📍 災害回報 <span className="sidebar-tab__count">{filteredEvents.length}</span>
                    </button>
                    <button
                        className={`sidebar-tab ${tab === 'ncdr' ? 'sidebar-tab--active' : ''}`}
                        onClick={() => setTab('ncdr')}
                    >
                        ⚠️ NCDR示警 <span className="sidebar-tab__count">{ncdrAlerts.length}</span>
                    </button>
                </div>

                {tab === 'events' && (
                    <>
                        <div className="map-filters">
                            <div className="map-filter">
                                <label htmlFor="map-filter-category">分類</label>
                                <select
                                    id="map-filter-category"
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                >
                                    <option value="all">全部分類</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="map-filter">
                                <label htmlFor="map-filter-severity">程度</label>
                                <select
                                    id="map-filter-severity"
                                    value={severityFilter}
                                    onChange={(e) => setSeverityFilter(e.target.value)}
                                >
                                    <option value="all">全部程度</option>
                                    <option value="5">危機</option>
                                    <option value="4">緊急</option>
                                    <option value="3">警戒</option>
                                    <option value="2">注意</option>
                                    <option value="1">一般</option>
                                </select>
                            </div>
                        </div>

                        {isLoadingEvents && <div className="loading">載入中...</div>}

                        {!isLoadingEvents && filteredEvents.length === 0 && (
                            <div className="empty-state">
                                <span>📭</span>
                                <p>沒有符合條件的事件</p>
                            </div>
                        )}

                        <div className="map-event-list">
                            {filteredEvents.map((event) => (
                                <button
                                    key={event.id}
                                    type="button"
                                    className={`map-event-item ${selection?.kind === 'event' && selection.event.id === event.id ? 'map-event-item--selected' : ''}`}
                                    onClick={() => onSelectEvent(event)}
                                >
                                    <div className="map-event-item__header">
                                        <Badge
                                            variant={(event.severity || 0) >= 4 ? 'danger' : (event.severity || 0) >= 3 ? 'warning' : 'default'}
                                            size="sm"
                                        >
                                            {event.category || '其他'}
                                        </Badge>
                                        {event.latitude && event.longitude && (
                                            <MapPin size={14} aria-label="有座標" className="map-event-item__location" />
                                        )}
                                    </div>
                                    <div className="map-event-item__title">{event.title}</div>
                                    <div className="map-event-item__meta">
                                        <span style={{ color: getSeverityColor(event.severity || 1) }}>
                                            {getSeverityLabel(event.severity || 1)}
                                        </span>
                                        <span>{formatRelativeTime(event.createdAt)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {tab === 'ncdr' && (
                    <>
                        <div className="map-filters">
                            <div className="map-filter">
                                <label htmlFor="map-filter-ncdr-type">類型</label>
                                <select
                                    id="map-filter-ncdr-type"
                                    value={ncdrTypeFilter}
                                    onChange={(e) => setNcdrTypeFilter(e.target.value)}
                                >
                                    <option value="all">全部類型</option>
                                    {[...NCDR_CORE_TYPES, ...NCDR_EXTENDED_TYPES].map(t => (
                                        <option key={t.id} value={t.id.toString()}>
                                            {t.icon} {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="map-filter">
                                <label htmlFor="map-filter-ncdr-severity">程度</label>
                                <select
                                    id="map-filter-ncdr-severity"
                                    value={ncdrSeverityFilter}
                                    onChange={(e) => setNcdrSeverityFilter(e.target.value)}
                                >
                                    <option value="all">全部程度</option>
                                    <option value="critical">危急</option>
                                    <option value="warning">警告</option>
                                    <option value="info">資訊</option>
                                </select>
                            </div>
                        </div>

                        {filteredNcdr.length === 0 ? (
                            <div className="empty-state">
                                <span>📭</span>
                                <p>沒有符合條件的 NCDR 示警</p>
                            </div>
                        ) : (
                            <div className="map-event-list">
                                {filteredNcdr.map((alert) => (
                                    <button
                                        key={alert.id}
                                        type="button"
                                        className={`map-event-item map-event-item--ncdr ${selection?.kind === 'ncdr' && selection.alert.id === alert.id ? 'map-event-item--selected' : ''}`}
                                        onClick={() => onSelectNcdr(alert)}
                                    >
                                        <div className="map-event-item__header">
                                            <Badge
                                                variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}
                                                size="sm"
                                            >
                                                {alert.alertTypeName}
                                            </Badge>
                                            {alert.latitude && alert.longitude && (
                                                <MapPin size={14} aria-label="有座標" className="map-event-item__location" />
                                            )}
                                        </div>
                                        <div className="map-event-item__title">{alert.title}</div>
                                        <div className="map-event-item__meta">
                                            <span className="ncdr-source">{alert.sourceUnit}</span>
                                            <span>{formatRelativeTime(alert.publishedAt)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </Card>
        </aside>
    );
}

// ===== 行動卡內容 =====

function ActionCard({
    selection,
    onClear,
    onCreateTask,
}: {
    selection: MapSelection;
    onClear: () => void;
    onCreateTask: () => void;
}) {
    return (
        <div className="map-action-card__content">
            <button
                type="button"
                className="map-action-card__close"
                aria-label="關閉詳情"
                onClick={onClear}
            >
                <X size={16} aria-hidden="true" />
            </button>
            <ActionCardBody selection={selection} onCreateTask={onCreateTask} />
        </div>
    );
}

function ActionCardBody({
    selection,
    onCreateTask,
}: {
    selection: MapSelection;
    onCreateTask: () => void;
}) {
    switch (selection.kind) {
        case 'event': {
            const event = selection.event;
            const hasCoords = !!(event.latitude && event.longitude);
            return (
                <>
                    <div className="map-action-card__header">
                        <Badge
                            variant={(event.severity || 0) >= 4 ? 'danger' : (event.severity || 0) >= 3 ? 'warning' : 'default'}
                        >
                            {getSeverityLabel(event.severity || 1)}
                        </Badge>
                        <span className="map-action-card__category">{event.category || '其他'}</span>
                    </div>
                    <h4 className="map-action-card__title">{event.title}</h4>
                    <p className="map-action-card__desc">{event.description || '無描述'}</p>
                    <dl className="map-action-card__info">
                        <div>
                            <dt>狀態</dt>
                            <dd>{event.status === 'active' ? '進行中' : '已解除'}</dd>
                        </div>
                        {event.address && (
                            <div>
                                <dt>地址</dt>
                                <dd>{event.address}</dd>
                            </div>
                        )}
                        {hasCoords && (
                            <div>
                                <dt>GPS</dt>
                                <dd>
                                    <code className="gps-coords">
                                        {Number(event.latitude).toFixed(6)}, {Number(event.longitude).toFixed(6)}
                                    </code>
                                    <button
                                        className="copy-btn"
                                        title="複製座標"
                                        aria-label="複製座標"
                                        onClick={() => navigator.clipboard.writeText(`${event.latitude}, ${event.longitude}`)}
                                    >
                                        📋
                                    </button>
                                </dd>
                            </div>
                        )}
                    </dl>
                    <div className="map-action-card__actions">
                        {hasCoords && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => openDirections(event.latitude!, event.longitude!)}
                            >
                                <Compass size={16} aria-hidden="true" /> 導航
                            </Button>
                        )}
                        {/* 派遣捷徑：帶到任務頁建立派遣 */}
                        <Button variant="secondary" size="sm" onClick={onCreateTask}>
                            <ClipboardList size={16} aria-hidden="true" /> 建立任務
                        </Button>
                    </div>
                </>
            );
        }

        case 'ncdr': {
            const alert = selection.alert;
            return (
                <>
                    <div className="map-action-card__header">
                        <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}>
                            {alert.alertTypeName}
                        </Badge>
                        <span className="map-action-card__category">NCDR 示警</span>
                    </div>
                    <h4 className="map-action-card__title">{alert.title}</h4>
                    <p className="map-action-card__desc">{alert.description || '無描述'}</p>
                    {alert.sourceLink && (
                        <div className="map-action-card__actions">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => window.open(alert.sourceLink, '_blank')}
                            >
                                <ExternalLink size={16} aria-hidden="true" /> 來源
                            </Button>
                        </div>
                    )}
                </>
            );
        }

        case 'shelter': {
            const s = selection.shelter;
            return (
                <ResourceCard
                    badge="🏠 避難收容所"
                    name={s.name}
                    lines={[
                        `📍 ${s.address || `${s.city}${s.district}`}`,
                        `👥 可收容人數：${s.capacity || '未知'}`,
                    ]}
                    lat={s.latitude}
                    lng={s.longitude}
                />
            );
        }

        case 'aed': {
            const aed = selection.aed;
            return (
                <ResourceCard
                    badge="❤️ AED"
                    name={aed.name}
                    lines={[
                        `📍 ${aed.address}`,
                        ...(aed.placeName ? [`🏢 ${aed.placeName}${aed.floor ? `（${aed.floor}）` : ''}`] : []),
                        ...(aed.openHours ? [`🕐 開放時間：${aed.openHours}`] : []),
                    ]}
                    lat={aed.latitude}
                    lng={aed.longitude}
                />
            );
        }

        case 'warehouse': {
            const w = selection.warehouse;
            return (
                <ResourceCard
                    badge={w.isPrimary ? '📦 主倉庫' : '📦 倉庫'}
                    name={w.name}
                    lines={[
                        `📍 ${w.address || '無地址'}`,
                        ...(w.contactPerson ? [`👤 ${w.contactPerson}${w.contactPhone ? `（${w.contactPhone}）` : ''}`] : []),
                    ]}
                    lat={Number(w.latitude)}
                    lng={Number(w.longitude)}
                />
            );
        }

        case 'airRaidShelter': {
            // C1.2：防空避難處所行動卡（欄位與 InfoWindow 一致）
            const s = selection.shelter;
            return (
                <ResourceCard
                    badge="🛡️ 防空避難處所"
                    name={s.name}
                    lines={[
                        `📍 ${s.address || `${s.city}${s.district}`}`,
                        `👥 容納人數：${s.capacity || '未知'}`,
                        ...(s.basementLevels != null ? [`🏚️ 地下 ${s.basementLevels} 層`] : []),
                        ...(s.managingOrg ? [`🏢 管理單位：${s.managingOrg}`] : []),
                    ]}
                    lat={s.latitude}
                    lng={s.longitude}
                />
            );
        }

        default:
            return null;
    }
}

function ResourceCard({
    badge,
    name,
    lines,
    lat,
    lng,
}: {
    badge: string;
    name: string;
    lines: string[];
    lat: number;
    lng: number;
}) {
    return (
        <>
            <div className="map-action-card__header">
                <Badge variant="default">{badge}</Badge>
            </div>
            <h4 className="map-action-card__title">{name}</h4>
            <dl className="map-action-card__info">
                {lines.map((line, i) => (
                    <div key={i}><dd>{line}</dd></div>
                ))}
            </dl>
            <div className="map-action-card__actions">
                <Button variant="primary" size="sm" onClick={() => openDirections(lat, lng)}>
                    <Compass size={16} aria-hidden="true" /> 導航
                </Button>
            </div>
        </>
    );
}
