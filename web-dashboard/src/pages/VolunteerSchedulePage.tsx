import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Badge } from '../design-system';
import { getVolunteers } from '../api/services';
import type { Volunteer } from '../api/services';
import './VolunteerSchedulePage.css';

// 班別類型
type ShiftType = 'morning' | 'afternoon' | 'night';

interface ScheduleSlot {
    date: string;
    shift: ShiftType;
    volunteerId?: string;
    volunteerName?: string;
}

// 班別設定
const SHIFTS: Record<ShiftType, { label: string; time: string; color: string }> = {
    morning: { label: '早班', time: '06:00 - 14:00', color: '#10b981' },
    afternoon: { label: '午班', time: '14:00 - 22:00', color: '#f59e0b' },
    night: { label: '夜班', time: '22:00 - 06:00', color: '#6366f1' },
};

// 生成未來一週日期
function getWeekDates(): string[] {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
}

export default function VolunteerSchedulePage() {
    const [selectedSlot, setSelectedSlot] = useState<{ date: string; shift: ShiftType } | null>(null);
    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);

    // 獲取志工列表
    const { data: volunteersData, isLoading } = useQuery({
        queryKey: ['volunteers'],
        queryFn: () => getVolunteers().then(res => res.data),
    });

    const volunteers = (volunteersData as Volunteer[]) || [];
    const weekDates = getWeekDates();

    // 初始化模擬排班
    useEffect(() => {
        if (volunteers.length > 0 && schedule.length === 0) {
            const initialSchedule: ScheduleSlot[] = [];
            weekDates.forEach(date => {
                Object.keys(SHIFTS).forEach(shift => {
                    const randomVolunteer = volunteers[Math.floor(Math.random() * volunteers.length)];
                    if (Math.random() > 0.3) { // 70% 機率有排班
                        initialSchedule.push({
                            date,
                            shift: shift as ShiftType,
                            volunteerId: randomVolunteer.id,
                            volunteerName: randomVolunteer.name,
                        });
                    } else {
                        initialSchedule.push({
                            date,
                            shift: shift as ShiftType,
                        });
                    }
                });
            });
            setSchedule(initialSchedule);
        }
    }, [volunteers]);

    // 取得某時段的排班
    const getSlotSchedule = (date: string, shift: ShiftType): ScheduleSlot | undefined => {
        return schedule.find(s => s.date === date && s.shift === shift);
    };

    // 指派志工
    const assignVolunteer = (volunteer: Volunteer) => {
        if (!selectedSlot) return;
        setSchedule(prev => prev.map(slot => {
            if (slot.date === selectedSlot.date && slot.shift === selectedSlot.shift) {
                return { ...slot, volunteerId: volunteer.id, volunteerName: volunteer.name };
            }
            return slot;
        }));
        setSelectedSlot(null);
    };

    // 移除排班
    const unassignVolunteer = (date: string, shift: ShiftType) => {
        setSchedule(prev => prev.map(slot => {
            if (slot.date === date && slot.shift === shift) {
                return { ...slot, volunteerId: undefined, volunteerName: undefined };
            }
            return slot;
        }));
    };

    return (
        <div className="page volunteer-schedule-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📅 志工排班</h2>
                    <p className="page-subtitle">班表管理與調度</p>
                </div>
                <Badge variant="info">本週排班</Badge>
            </div>

            {/* 排班表格 */}
            <Card padding="lg" className="schedule-card">
                <div className="schedule-grid">
                    {/* 表頭 */}
                    <div className="schedule-header">
                        <div className="schedule-cell schedule-cell--header">班別 / 日期</div>
                        {weekDates.map(date => (
                            <div key={date} className="schedule-cell schedule-cell--header">
                                {formatDate(date)}
                            </div>
                        ))}
                    </div>

                    {/* 班別行 */}
                    {Object.entries(SHIFTS).map(([shiftKey, shift]) => (
                        <div key={shiftKey} className="schedule-row">
                            <div className="schedule-cell schedule-cell--shift" style={{ borderLeftColor: shift.color }}>
                                <div className="shift-name">{shift.label}</div>
                                <div className="shift-time">{shift.time}</div>
                            </div>
                            {weekDates.map(date => {
                                const slot = getSlotSchedule(date, shiftKey as ShiftType);
                                return (
                                    <div
                                        key={`${date}-${shiftKey}`}
                                        className={`schedule-cell schedule-cell--slot ${slot?.volunteerId ? 'has-volunteer' : 'empty'}`}
                                        onClick={() => setSelectedSlot({ date, shift: shiftKey as ShiftType })}
                                    >
                                        {slot?.volunteerName ? (
                                            <div className="slot-content">
                                                <span className="volunteer-name">{slot.volunteerName}</span>
                                                <button
                                                    className="remove-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        unassignVolunteer(date, shiftKey as ShiftType);
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="empty-slot">+ 指派</span>
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
                            {formatDate(selectedSlot.date)} - {SHIFTS[selectedSlot.shift].label}
                        </p>

                        {isLoading ? (
                            <div className="loading-state">載入中...</div>
                        ) : (
                            <div className="volunteer-list">
                                {volunteers.map((volunteer: Volunteer) => (
                                    <div
                                        key={volunteer.id}
                                        className="volunteer-item"
                                        onClick={() => assignVolunteer(volunteer)}
                                    >
                                        <span className="volunteer-avatar">👤</span>
                                        <div className="volunteer-info">
                                            <span className="name">{volunteer.name}</span>
                                            <span className="region">{volunteer.region}</span>
                                        </div>
                                        <Badge variant={volunteer.status === 'available' ? 'success' : 'default'} size="sm">
                                            {volunteer.status === 'available' ? '可用' : '忙碌'}
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
        </div>
    );
}
