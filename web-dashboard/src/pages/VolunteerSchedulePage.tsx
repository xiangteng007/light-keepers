import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, X, ChevronDown, ChevronRight, Check, Plus, Minus } from 'lucide-react';
import { Card, Button, Badge, Modal } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { getAccounts } from '../api/services';
import './VolunteerSchedulePage.css';

// 行動端斷點偵測（DESIGN_LANGUAGE.md §6：mobile ≤767px）
function useIsMobile(breakpoint = 767): boolean {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
    );
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
        const handler = () => setIsMobile(mq.matches);
        handler();
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [breakpoint]);
    return isMobile;
}

// ===== 類型定義 =====
type ViewRange = 'week' | 'biweek' | 'month';

interface ShiftConfig {
    id: string;
    label: string;
    startTime: string;
    endTime: string;
    color: string;
}

interface ScheduleSlot {
    date: string;
    shiftId: string;
    volunteers: { id: string; name: string }[];
}

// 排班用志工介面
interface ScheduleVolunteer {
    id: string;
    name: string;
    email: string;
    status: 'available' | 'busy';
    region: string;
}

// 預設顏色池（班別為裝飾性類別色，非狀態色 — 依 DESIGN_LANGUAGE.md §3 不得與狀態色混淆用途，
// 僅用於視覺區分不同班別，非危急/警戒/安全語意）
const SHIFT_COLORS = [
    '#10b981', // 綠
    '#f59e0b', // 橙
    '#6366f1', // 紫
    '#ef4444', // 紅
    '#06b6d4', // 青
    '#8b5cf6', // 紫羅蘭
    '#ec4899', // 粉
    '#14b8a6', // 青綠
];

// ===== 工具函數 =====

// 根據班別數量自動計算時間分配
function calculateDefaultShifts(count: number): ShiftConfig[] {
    if (count <= 0) return [];

    const hoursPerShift = 24 / count;
    const shifts: ShiftConfig[] = [];

    // 預設班別名稱
    const defaultLabels: Record<number, string[]> = {
        1: ['全天'],
        2: ['早班', '晚班'],
        3: ['早班', '午班', '夜班'],
        4: ['早班', '午班', '晚班', '夜班'],
    };

    const labels = defaultLabels[count] || Array.from({ length: count }, (_, i) => `班別 ${i + 1}`);

    for (let i = 0; i < count; i++) {
        const startHour = Math.round(i * hoursPerShift);
        const endHour = Math.round((i + 1) * hoursPerShift);

        shifts.push({
            id: `shift-${i}`,
            label: labels[i],
            startTime: `${String(startHour).padStart(2, '0')}:00`,
            endTime: endHour === 24 ? '24:00' : `${String(endHour).padStart(2, '0')}:00`,
            color: SHIFT_COLORS[i % SHIFT_COLORS.length],
        });
    }

    return shifts;
}

// 根據視圖範圍生成日期列表
function getDates(range: ViewRange): string[] {
    const dates: string[] = [];
    const today = new Date();
    const days = range === 'week' ? 7 : range === 'biweek' ? 14 : 30;

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
}

// 格式化日期顯示
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
}

// 視圖範圍標籤
const VIEW_RANGE_LABELS: Record<ViewRange, string> = {
    week: '本週排班',
    biweek: '雙週排班',
    month: '月排班',
};

// ===== 主組件 =====
export default function VolunteerSchedulePage() {
    const [viewRange, setViewRange] = useState<ViewRange>('week');
    const [shifts, setShifts] = useState<ShiftConfig[]>(() => calculateDefaultShifts(3));
    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<{ date: string; shiftId: string } | null>(null);
    const [expandedSlot, setExpandedSlot] = useState<string | null>(null); // 展開的時段
    const [editingShift, setEditingShift] = useState<string | null>(null);
    const [editingTime, setEditingTime] = useState<string | null>(null);
    const [mobileDayIndex, setMobileDayIndex] = useState(0);
    const isMobile = useIsMobile();

    // 獲取志工列表 (使用 accounts API，因為 volunteers 表可能為空)
    const { data: accountsData, isLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: () => getAccounts().then(res => res.data),
    });

    // 轉換 accounts 為志工格式
    const volunteers = useMemo(() => {
        if (!accountsData) return [];
        return accountsData.map(acc => ({
            id: acc.id,
            name: acc.displayName || acc.email,
            email: acc.email,
            status: 'available' as const,
            region: '',
        }));
    }, [accountsData]);

    const dates = useMemo(() => getDates(viewRange), [viewRange]);

    // 行動端 segmented day-switcher：切換範圍時重設回第一天
    useEffect(() => {
        setMobileDayIndex(0);
    }, [viewRange]);

    // 行動端只顯示單一天（segmented tabs 切換），桌機顯示整個範圍（水平捲動）
    const displayDates = isMobile ? [dates[mobileDayIndex] ?? dates[0]].filter(Boolean) : dates;

    // 初始化排班資料
    useEffect(() => {
        if (volunteers.length > 0 && schedule.length === 0) {
            const initialSchedule: ScheduleSlot[] = [];
            dates.forEach(date => {
                shifts.forEach(shift => {
                    // 隨機指派 0-3 個志工
                    const count = Math.floor(Math.random() * 4);
                    const shuffled = [...volunteers].sort(() => Math.random() - 0.5);
                    const assigned = shuffled.slice(0, count).map(v => ({ id: v.id, name: v.name }));
                    initialSchedule.push({
                        date,
                        shiftId: shift.id,
                        volunteers: assigned,
                    });
                });
            });
            setSchedule(initialSchedule);
        }
    }, [volunteers, shifts, dates]);

    // 取得某時段的排班
    const getSlotSchedule = (date: string, shiftId: string): ScheduleSlot | undefined => {
        return schedule.find(s => s.date === date && s.shiftId === shiftId);
    };

    // 指派志工（新增到列表）
    const assignVolunteer = (volunteer: ScheduleVolunteer) => {
        if (!selectedSlot) return;
        setSchedule(prev => prev.map(slot => {
            if (slot.date === selectedSlot.date && slot.shiftId === selectedSlot.shiftId) {
                // 檢查是否已指派
                if (slot.volunteers.some(v => v.id === volunteer.id)) return slot;
                return { ...slot, volunteers: [...slot.volunteers, { id: volunteer.id, name: volunteer.name }] };
            }
            return slot;
        }));
    };

    // 移除單一志工
    const removeVolunteerFromSlot = (date: string, shiftId: string, volunteerId: string) => {
        setSchedule(prev => prev.map(slot => {
            if (slot.date === date && slot.shiftId === shiftId) {
                return { ...slot, volunteers: slot.volunteers.filter(v => v.id !== volunteerId) };
            }
            return slot;
        }));
    };

    // 切換展開狀態
    const toggleExpand = (slotKey: string) => {
        setExpandedSlot(prev => prev === slotKey ? null : slotKey);
    };

    // 新增班別
    const addShift = () => {
        const newShifts = calculateDefaultShifts(shifts.length + 1);
        // 保留已編輯的名稱
        setShifts(newShifts.map((s, i) => {
            if (i < shifts.length && shifts[i].label !== calculateDefaultShifts(shifts.length)[i]?.label) {
                return { ...s, label: shifts[i].label };
            }
            return s;
        }));
    };

    // 移除班別
    const removeShift = () => {
        if (shifts.length <= 1) return;
        const newShifts = calculateDefaultShifts(shifts.length - 1);
        setShifts(newShifts.map((s, i) => {
            if (i < shifts.length - 1 && shifts[i].label !== calculateDefaultShifts(shifts.length)[i]?.label) {
                return { ...s, label: shifts[i].label };
            }
            return s;
        }));
    };

    // 更新班別名稱
    const updateShiftLabel = (shiftId: string, newLabel: string) => {
        setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, label: newLabel } : s));
        setEditingShift(null);
    };

    // 更新班別時間
    const updateShiftTime = (shiftId: string, field: 'startTime' | 'endTime', value: string) => {
        setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, [field]: value } : s));
    };

    // 格式化時間顯示
    const formatTimeRange = (startTime: string, endTime: string) => {
        return `${startTime} - ${endTime}`;
    };

    // 計算班別時長（小時）
    const getShiftHours = (shift: ShiftConfig): number => {
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const endTime = shift.endTime === '24:00' ? '00:00' : shift.endTime;
        const [endH, endM] = endTime.split(':').map(Number);
        let hours = (shift.endTime === '24:00' ? 24 : endH) - startH;
        hours += (endM - startM) / 60;
        return hours > 0 ? hours : 24 + hours; // 處理跨日
    };

    // 統計各志工排班時數
    const volunteerHoursStats = useMemo(() => {
        const stats: { id: string; name: string; hours: number; shifts: number }[] = [];
        const volunteerMap = new Map<string, { name: string; hours: number; shifts: number }>();

        schedule.forEach(slot => {
            const shift = shifts.find(s => s.id === slot.shiftId);
            if (!shift) return;
            const shiftHours = getShiftHours(shift);

            slot.volunteers.forEach(v => {
                const existing = volunteerMap.get(v.id);
                if (existing) {
                    existing.hours += shiftHours;
                    existing.shifts += 1;
                } else {
                    volunteerMap.set(v.id, { name: v.name, hours: shiftHours, shifts: 1 });
                }
            });
        });

        volunteerMap.forEach((value, key) => {
            stats.push({ id: key, ...value });
        });

        return stats.sort((a, b) => b.hours - a.hours);
    }, [schedule, shifts]);

    // 獲取當前選中班別的資訊
    const selectedShift = selectedSlot ? shifts.find(s => s.id === selectedSlot.shiftId) : null;

    return (
        <div className="volunteer-schedule-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h1>志工排班</h1>
                    <p className="page-subtitle">班表管理與調度</p>
                </div>
                <div className="page-header__right">
                    {/* 日期範圍選擇器 */}
                    <div className="view-range-selector" role="tablist" aria-label="排班檢視範圍">
                        {(['week', 'biweek', 'month'] as ViewRange[]).map(range => (
                            <button
                                key={range}
                                type="button"
                                role="tab"
                                aria-selected={viewRange === range}
                                className={`view-range-btn ${viewRange === range ? 'is-active' : ''}`}
                                onClick={() => setViewRange(range)}
                            >
                                {VIEW_RANGE_LABELS[range]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 行動端 segmented day-switcher：取代整個範圍的水平捲動 */}
            {isMobile && (
                <div className="day-switcher" role="tablist" aria-label="選擇日期">
                    {dates.map((date, idx) => (
                        <button
                            key={date}
                            type="button"
                            role="tab"
                            aria-selected={mobileDayIndex === idx}
                            className={`day-switcher__btn ${mobileDayIndex === idx ? 'is-active' : ''}`}
                            onClick={() => setMobileDayIndex(idx)}
                        >
                            {formatDate(date)}
                        </button>
                    ))}
                </div>
            )}

            {/* 排班表格 */}
            <Card padding="lg" className="schedule-card">
                {/* 班別控制 */}
                <div className="shift-controls-bar">
                    <span className="shift-controls-label">班別設定</span>
                    <div className="shift-controls">
                        <button
                            type="button"
                            className="shift-control-btn"
                            onClick={removeShift}
                            disabled={shifts.length <= 1}
                            aria-label="減少班別"
                            title="減少班別"
                        >
                            <Minus size={16} aria-hidden="true" />
                        </button>
                        <span className="shift-count tabular-nums">{shifts.length} 班</span>
                        <button
                            type="button"
                            className="shift-control-btn"
                            onClick={addShift}
                            disabled={shifts.length >= 8}
                            aria-label="增加班別"
                            title="增加班別"
                        >
                            <Plus size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div className="schedule-grid" style={{
                    gridTemplateColumns: `140px repeat(${displayDates.length}, minmax(100px, 1fr))`
                }}>
                    {/* 表頭 */}
                    <div className="schedule-header" style={{
                        gridColumn: `span ${displayDates.length + 1}`,
                        display: 'contents'
                    }}>
                        <div className="schedule-cell schedule-cell--header">班別 / 日期</div>
                        {displayDates.map(date => (
                            <div key={date} className="schedule-cell schedule-cell--header tabular-nums">
                                {formatDate(date)}
                            </div>
                        ))}
                    </div>

                    {/* 班別行 */}
                    {shifts.map((shift) => (
                        <div key={shift.id} className="schedule-row" style={{ display: 'contents' }}>
                            <div
                                className="schedule-cell schedule-cell--shift"
                                style={{ borderLeftColor: shift.color }}
                            >
                                {/* 可編輯的班別名稱 */}
                                {editingShift === shift.id ? (
                                    <input
                                        type="text"
                                        className="shift-name-input"
                                        defaultValue={shift.label}
                                        autoFocus
                                        onBlur={(e) => updateShiftLabel(shift.id, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                updateShiftLabel(shift.id, e.currentTarget.value);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="shift-name shift-name--editable"
                                        onClick={() => setEditingShift(shift.id)}
                                        title="點擊編輯班別名稱"
                                    >
                                        {shift.label}
                                    </div>
                                )}

                                {/* 可編輯的時間 */}
                                {editingTime === shift.id ? (
                                    <div className="shift-time-edit">
                                        <input
                                            type="time"
                                            className="shift-time-input"
                                            value={shift.startTime}
                                            onChange={(e) => updateShiftTime(shift.id, 'startTime', e.target.value)}
                                        />
                                        <span>-</span>
                                        <input
                                            type="time"
                                            className="shift-time-input"
                                            value={shift.endTime === '24:00' ? '00:00' : shift.endTime}
                                            onChange={(e) => updateShiftTime(shift.id, 'endTime', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="shift-time-done"
                                            onClick={() => setEditingTime(null)}
                                            aria-label="完成編輯時間"
                                        >
                                            <Check size={12} aria-hidden="true" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className="shift-time shift-time--editable"
                                        onClick={() => setEditingTime(shift.id)}
                                        title="點擊編輯時間"
                                    >
                                        {formatTimeRange(shift.startTime, shift.endTime)}
                                    </div>
                                )}
                            </div>

                            {displayDates.map(date => {
                                const slot = getSlotSchedule(date, shift.id);
                                const slotKey = `${date}-${shift.id}`;
                                const isExpanded = expandedSlot === slotKey;
                                const volunteerCount = slot?.volunteers.length || 0;

                                return (
                                    <div
                                        key={slotKey}
                                        className={`schedule-cell schedule-cell--slot ${volunteerCount > 0 ? 'has-volunteer' : 'empty'}`}
                                    >
                                        {volunteerCount === 0 ? (
                                            <button
                                                type="button"
                                                className="empty-slot"
                                                onClick={() => setSelectedSlot({ date, shiftId: shift.id })}
                                            >
                                                + 指派
                                            </button>
                                        ) : volunteerCount === 1 ? (
                                            <div className="slot-content">
                                                <button
                                                    type="button"
                                                    className="volunteer-name"
                                                    onClick={() => setSelectedSlot({ date, shiftId: shift.id })}
                                                >
                                                    {slot!.volunteers[0].name}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="remove-btn"
                                                    aria-label={`移除 ${slot!.volunteers[0].name}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeVolunteerFromSlot(date, shift.id, slot!.volunteers[0].id);
                                                    }}
                                                >
                                                    <X size={12} aria-hidden="true" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="slot-multi">
                                                <button
                                                    type="button"
                                                    className="slot-multi__header"
                                                    onClick={() => toggleExpand(slotKey)}
                                                    aria-expanded={isExpanded}
                                                >
                                                    <Users size={14} aria-hidden="true" />
                                                    <span className="slot-multi__count tabular-nums">
                                                        {volunteerCount} 人
                                                    </span>
                                                    <span className="slot-multi__toggle" aria-hidden="true">
                                                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    </span>
                                                </button>
                                                {isExpanded && (
                                                    <div className="slot-multi__list">
                                                        {slot!.volunteers.map(v => (
                                                            <div key={v.id} className="slot-multi__item">
                                                                <span>{v.name}</span>
                                                                <button
                                                                    type="button"
                                                                    className="remove-btn-sm"
                                                                    aria-label={`移除 ${v.name}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeVolunteerFromSlot(date, shift.id, v.id);
                                                                    }}
                                                                >
                                                                    <X size={12} aria-hidden="true" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            className="slot-multi__add"
                                                            onClick={() => setSelectedSlot({ date, shiftId: shift.id })}
                                                        >
                                                            + 新增
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </Card>

            {/* 指派志工 Modal */}
            <Modal
                isOpen={!!selectedSlot}
                onClose={() => setSelectedSlot(null)}
                title="指派志工"
                subtitle={selectedSlot ? `${formatDate(selectedSlot.date)} - ${selectedShift?.label}` : undefined}
                size="sm"
                footer={(
                    <Button variant="secondary" onClick={() => setSelectedSlot(null)}>
                        取消
                    </Button>
                )}
            >
                {selectedSlot && (
                    isLoading ? (
                        <div className="volunteer-list">
                            <div className="loading-state">載入中...</div>
                        </div>
                    ) : volunteers.length === 0 ? (
                        <EmptyState variant="minimal" title="尚無志工資料" />
                    ) : (
                        <div className="volunteer-list">
                            {volunteers.map((volunteer) => (
                                <button
                                    type="button"
                                    key={volunteer.id}
                                    className="volunteer-item"
                                    onClick={() => assignVolunteer(volunteer)}
                                >
                                    <span className="volunteer-avatar" aria-hidden="true">
                                        <Users size={18} />
                                    </span>
                                    <div className="volunteer-info">
                                        <span className="name">{volunteer.name}</span>
                                        <span className="region">{volunteer.email}</span>
                                    </div>
                                    <Badge variant="success" size="sm">
                                        可用
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    )
                )}
            </Modal>

            {/* 志工時數統計 */}
            {volunteerHoursStats.length > 0 && (
                <Card padding="lg" className="hours-stats-card">
                    <h3>排班時數統計</h3>
                    <p className="stats-subtitle">根據目前排班計算的預估時數</p>
                    <div className="hours-stats-list">
                        {volunteerHoursStats.slice(0, 10).map((stat, index) => (
                            <div key={stat.id} className="hours-stat-item">
                                <span className="stat-rank tabular-nums">#{index + 1}</span>
                                <span className="stat-name">{stat.name}</span>
                                <span className="stat-info">
                                    <Badge variant="info" size="sm">{stat.shifts} 班</Badge>
                                </span>
                                <span className="stat-hours tabular-nums">{stat.hours.toFixed(1)} 小時</span>
                            </div>
                        ))}
                    </div>
                    {volunteerHoursStats.length > 10 && (
                        <p className="stats-more">還有 {volunteerHoursStats.length - 10} 位志工...</p>
                    )}
                </Card>
            )}
        </div>
    );
}
