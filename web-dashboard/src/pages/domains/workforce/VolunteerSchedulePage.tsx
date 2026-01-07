import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Badge } from '../design-system';
import { getAccounts } from '../api/services';
import './VolunteerSchedulePage.css';

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

// 排班用志工介�?
interface ScheduleVolunteer {
    id: string;
    name: string;
    email: string;
    status: 'available' | 'busy';
    region: string;
}

// 預設顏色�?
const SHIFT_COLORS = [
    '#10b981', // �?
    '#f59e0b', // �?
    '#6366f1', // �?
    '#ef4444', // �?
    '#06b6d4', // �?
    '#8b5cf6', // 紫羅�?
    '#ec4899', // �?
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

// 格式化日期顯�?
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const weekdays = ['�?, '一', '�?, '�?, '�?, '�?, '�?];
    return `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
}

// 視圖範圍標籤
const VIEW_RANGE_LABELS: Record<ViewRange, string> = {
    week: '本週排�?,
    biweek: '雙週排�?,
    month: '月排�?,
};

// ===== 主組�?=====
export default function VolunteerSchedulePage() {
    const [viewRange, setViewRange] = useState<ViewRange>('week');
    const [shifts, setShifts] = useState<ShiftConfig[]>(() => calculateDefaultShifts(3));
    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<{ date: string; shiftId: string } | null>(null);
    const [expandedSlot, setExpandedSlot] = useState<string | null>(null); // 展開的時�?
    const [editingShift, setEditingShift] = useState<string | null>(null);
    const [editingTime, setEditingTime] = useState<string | null>(null);

    // 獲取志工列表 (使用 accounts API，因�?volunteers 表可能為�?
    const { data: accountsData, isLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: () => getAccounts().then(res => res.data),
    });

    // 轉換 accounts 為志工格�?
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

    // 初始化排班資�?
    useEffect(() => {
        if (volunteers.length > 0 && schedule.length === 0) {
            const initialSchedule: ScheduleSlot[] = [];
            dates.forEach(date => {
                shifts.forEach(shift => {
                    // 隨機指派 0-3 個志�?
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

    // 指派志工（新增到列表�?
    const assignVolunteer = (volunteer: ScheduleVolunteer) => {
        if (!selectedSlot) return;
        setSchedule(prev => prev.map(slot => {
            if (slot.date === selectedSlot.date && slot.shiftId === selectedSlot.shiftId) {
                // 檢查是否已指�?
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

    // 切換展開狀�?
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

    // 格式化時間顯�?
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

    // 統計各志工排班時�?
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

    // 獲取當前選中班別的資�?
    const selectedShift = selectedSlot ? shifts.find(s => s.id === selectedSlot.shiftId) : null;

    return (
        <div className="page volunteer-schedule-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📅 志工排班</h2>
                    <p className="page-subtitle">班表管理與調�?/p>
                </div>
                <div className="page-header__right">
                    {/* 日期範圍選擇�?*/}
                    <div className="view-range-selector">
                        {(['week', 'biweek', 'month'] as ViewRange[]).map(range => (
                            <button
                                key={range}
                                className={`view-range-btn ${viewRange === range ? 'active' : ''}`}
                                onClick={() => setViewRange(range)}
                            >
                                {VIEW_RANGE_LABELS[range]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 排班表格 */}
            <Card padding="lg" className="schedule-card">
                {/* 班別控制 */}
                <div className="shift-controls-bar">
                    <span className="shift-controls-label">班別設定</span>
                    <div className="shift-controls">
                        <button
                            className="shift-control-btn"
                            onClick={removeShift}
                            disabled={shifts.length <= 1}
                            title="減少班別"
                        >
                            �?
                        </button>
                        <span className="shift-count">{shifts.length} �?/span>
                        <button
                            className="shift-control-btn"
                            onClick={addShift}
                            disabled={shifts.length >= 8}
                            title="增加班別"
                        >
                            +
                        </button>
                    </div>
                </div>

                <div className="schedule-grid" style={{
                    gridTemplateColumns: `140px repeat(${dates.length}, minmax(100px, 1fr))`
                }}>
                    {/* 表頭 */}
                    <div className="schedule-header" style={{
                        gridColumn: `span ${dates.length + 1}`,
                        display: 'contents'
                    }}>
                        <div className="schedule-cell schedule-cell--header">班別 / 日期</div>
                        {dates.map(date => (
                            <div key={date} className="schedule-cell schedule-cell--header">
                                {formatDate(date)}
                            </div>
                        ))}
                    </div>

                    {/* 班別�?*/}
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
                                            className="shift-time-done"
                                            onClick={() => setEditingTime(null)}
                                        >
                                            �?
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

                            {dates.map(date => {
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
                                            <span
                                                className="empty-slot"
                                                onClick={() => setSelectedSlot({ date, shiftId: shift.id })}
                                            >
                                                + 指派
                                            </span>
                                        ) : volunteerCount === 1 ? (
                                            <div className="slot-content">
                                                <span
                                                    className="volunteer-name"
                                                    onClick={() => setSelectedSlot({ date, shiftId: shift.id })}
                                                >
                                                    {slot!.volunteers[0].name}
                                                </span>
                                                <button
                                                    className="remove-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeVolunteerFromSlot(date, shift.id, slot!.volunteers[0].id);
                                                    }}
                                                >
                                                    �?
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="slot-multi">
                                                <div
                                                    className="slot-multi__header"
                                                    onClick={() => toggleExpand(slotKey)}
                                                >
                                                    <span className="slot-multi__count">
                                                        👥 {volunteerCount} �?
                                                    </span>
                                                    <span className="slot-multi__toggle">
                                                        {isExpanded ? '�? : '�?}
                                                    </span>
                                                </div>
                                                {isExpanded && (
                                                    <div className="slot-multi__list">
                                                        {slot!.volunteers.map(v => (
                                                            <div key={v.id} className="slot-multi__item">
                                                                <span>{v.name}</span>
                                                                <button
                                                                    className="remove-btn-sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeVolunteerFromSlot(date, shift.id, v.id);
                                                                    }}
                                                                >
                                                                    �?
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
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
            {selectedSlot && (
                <div className="modal-overlay" onClick={() => setSelectedSlot(null)}>
                    <Card className="modal-content" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>指派志工</h3>
                        <p className="modal-subtitle">
                            {formatDate(selectedSlot.date)} - {selectedShift?.label}
                        </p>

                        {isLoading ? (
                            <div className="loading-state">載入�?..</div>
                        ) : (
                            <div className="volunteer-list">
                                {volunteers.map((volunteer) => (
                                    <div
                                        key={volunteer.id}
                                        className="volunteer-item"
                                        onClick={() => assignVolunteer(volunteer)}
                                    >
                                        <span className="volunteer-avatar">👤</span>
                                        <div className="volunteer-info">
                                            <span className="name">{volunteer.name}</span>
                                            <span className="region">{volunteer.email}</span>
                                        </div>
                                        <Badge variant="success" size="sm">
                                            可用
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setSelectedSlot(null)}>
                                取消
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* 志工時數統計 */}
            {volunteerHoursStats.length > 0 && (
                <Card padding="lg" className="hours-stats-card">
                    <h3>📊 排班時數統計</h3>
                    <p className="stats-subtitle">根據目前排班計算的預估時�?/p>
                    <div className="hours-stats-list">
                        {volunteerHoursStats.slice(0, 10).map((stat, index) => (
                            <div key={stat.id} className="hours-stat-item">
                                <span className="stat-rank">#{index + 1}</span>
                                <span className="stat-name">{stat.name}</span>
                                <span className="stat-info">
                                    <Badge variant="info" size="sm">{stat.shifts} �?/Badge>
                                </span>
                                <span className="stat-hours">{stat.hours.toFixed(1)} 小時</span>
                            </div>
                        ))}
                    </div>
                    {volunteerHoursStats.length > 10 && (
                        <p className="stats-more">還有 {volunteerHoursStats.length - 10} 位志�?..</p>
                    )}
                </Card>
            )}
        </div>
    );
}
