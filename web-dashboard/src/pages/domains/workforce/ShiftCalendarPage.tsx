import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin, Users, Pencil } from 'lucide-react';
import { Button, Card, Badge } from '../../../design-system';
import EmptyState from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import './ShiftCalendarPage.css';

interface Shift {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    volunteers: string[];
    capacity: number;
    type: 'regular' | 'emergency' | 'training';
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const TYPE_META: Record<Shift['type'], { label: string; badge: 'success' | 'danger' | 'info' }> = {
    regular: { label: '例行', badge: 'success' },
    emergency: { label: '緊急待命', badge: 'danger' },
    training: { label: '訓練', badge: 'info' },
};

export default function ShiftCalendarPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        setShifts([
            { id: '1', title: 'Morning Patrol', date: '2024-12-10', startTime: '08:00', endTime: '14:00', location: 'North Station', volunteers: ['Wang', 'Lin'], capacity: 4, type: 'regular' },
            { id: '2', title: 'Emergency Standby', date: '2024-12-10', startTime: '14:00', endTime: '22:00', location: 'HQ', volunteers: ['Chen'], capacity: 6, type: 'emergency' },
            { id: '3', title: 'First Aid Training', date: '2024-12-12', startTime: '09:00', endTime: '17:00', location: 'Training Center', volunteers: ['Wang', 'Lin', 'Chen'], capacity: 20, type: 'training' },
        ]);
        setLoading(false);
    }, []);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear(), month = date.getMonth();
        const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
        return { daysInMonth: lastDay.getDate(), startingDay: firstDay.getDay() };
    };

    const formatDateKey = (year: number, month: number, day: number) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const shiftsForDate = (dateKey: string) => shifts.filter(s => s.date === dateKey);
    const selectedShifts = selectedDate ? shiftsForDate(selectedDate) : [];

    // 行動端：本週 7 天的分頁式日期切換（避免看板欄位在小螢幕水平捲動）
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    return (
        <div className="shift-page">
            <header className="shift-page__header">
                <div>
                    <h1>值班行事曆</h1>
                    <p className="shift-page__subtitle">管理志工值班排程</p>
                </div>
                <Button icon={<Plus size={18} aria-hidden="true" />}>新增班次</Button>
            </header>

            <div className="shift-page__body">
                <section className="shift-panel shift-panel--calendar" aria-label="月曆">
                    <div className="shift-calendar__nav">
                        <button
                            type="button"
                            className="shift-calendar__nav-btn"
                            aria-label="上個月"
                            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                        >
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <h2 className="shift-calendar__title">{year} {MONTHS[month]}</h2>
                        <button
                            type="button"
                            className="shift-calendar__nav-btn"
                            aria-label="下個月"
                            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                        >
                            <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>

                    {/* 桌機／平板：完整月曆格線 */}
                    <div className="shift-calendar__grid shift-calendar__grid--month">
                        {DAYS.map(day => (
                            <div key={day} className="shift-calendar__weekday">{day}</div>
                        ))}
                        {Array.from({ length: startingDay }).map((_, i) => (
                            <div key={`e-${i}`} className="shift-calendar__cell shift-calendar__cell--empty" />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dateKey = formatDateKey(year, month, day);
                            const dayShifts = shiftsForDate(dateKey);
                            const isSelected = selectedDate === dateKey;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    className={`shift-calendar__cell ${isSelected ? 'shift-calendar__cell--selected' : ''}`}
                                    aria-pressed={isSelected}
                                    aria-label={`${MONTHS[month]} ${day} 日${dayShifts.length > 0 ? `，${dayShifts.length} 個班次` : ''}`}
                                    onClick={() => setSelectedDate(dateKey)}
                                >
                                    <span className="shift-calendar__day-num">{day}</span>
                                    {dayShifts.length > 0 && (
                                        <span className="shift-calendar__dots">
                                            {dayShifts.slice(0, 3).map(s => (
                                                <span key={s.id} className={`shift-dot shift-dot--${s.type}`} />
                                            ))}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* 行動端：本週分頁式日期切換 */}
                    <div className="shift-calendar__week-tabs" role="tablist" aria-label="選擇日期">
                        {weekDates.map((d) => {
                            const dateKey = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
                            const isSelected = selectedDate === dateKey;
                            const dayShifts = shiftsForDate(dateKey);
                            return (
                                <button
                                    key={dateKey}
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    className={`shift-week-tab ${isSelected ? 'shift-week-tab--active' : ''}`}
                                    onClick={() => setSelectedDate(dateKey)}
                                >
                                    <span className="shift-week-tab__dow">{DAYS[d.getDay()]}</span>
                                    <span className="shift-week-tab__date">{d.getDate()}</span>
                                    {dayShifts.length > 0 && <span className="shift-dot shift-dot--regular" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="shift-calendar__legend">
                        {(Object.entries(TYPE_META) as [Shift['type'], typeof TYPE_META[Shift['type']]][]).map(([type, meta]) => (
                            <span key={type} className="shift-calendar__legend-item">
                                <span className={`shift-dot shift-dot--${type}`} aria-hidden="true" />
                                {meta.label}
                            </span>
                        ))}
                    </div>
                </section>

                <section className="shift-panel shift-panel--detail" aria-label="班次詳情">
                    <h2 className="shift-panel__title">
                        {selectedDate ? `${selectedDate} 班次` : '請選擇日期'}
                    </h2>
                    {loading ? (
                        <Skeleton variant="text" count={3} height={80} />
                    ) : !selectedDate ? (
                        <EmptyState variant="minimal" title="點擊日期查看班次" />
                    ) : selectedShifts.length === 0 ? (
                        <EmptyState variant="minimal" title="這天沒有排定班次" />
                    ) : (
                        <div className="shift-detail-list">
                            {selectedShifts.map(shift => (
                                <Card key={shift.id} padding="md" className="shift-detail-card">
                                    <div className="shift-detail-card__head">
                                        <Badge variant={TYPE_META[shift.type].badge} dot>{TYPE_META[shift.type].label}</Badge>
                                        <h3>{shift.title}</h3>
                                    </div>
                                    <p className="shift-detail-card__time tabular-nums">{shift.startTime} – {shift.endTime}</p>
                                    <p className="shift-detail-card__meta"><MapPin size={14} aria-hidden="true" /> {shift.location}</p>
                                    <div className="shift-detail-card__footer">
                                        <span className="shift-detail-card__capacity tabular-nums">
                                            <Users size={14} aria-hidden="true" /> {shift.volunteers.length}/{shift.capacity}
                                        </span>
                                        <button type="button" className="shift-detail-card__edit" aria-label={`編輯 ${shift.title}`}>
                                            <Pencil size={14} aria-hidden="true" /> 編輯
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
