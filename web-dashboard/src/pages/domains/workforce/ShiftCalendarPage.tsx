import React, { useState } from 'react';
import './ShiftCalendarPage.css';

interface Shift {
    id: string;
    date: string;
    templateId: string;
    volunteerName: string;
    status: string;
}

interface ShiftTemplate {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color: string;
}

const templates: ShiftTemplate[] = [
    { id: 'morning', name: '早班', startTime: '06:00', endTime: '14:00', color: '#FFB74D' },
    { id: 'afternoon', name: '午班', startTime: '14:00', endTime: '22:00', color: '#64B5F6' },
    { id: 'night', name: '晚班', startTime: '22:00', endTime: '06:00', color: '#9575CD' },
];

export const ShiftCalendarPage: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: Date[] = [];

        // Add empty slots for days before first day
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(new Date(year, month, -firstDay.getDay() + i + 1));
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }

        return days;
    };

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const getShiftsForDate = (date: string) => shifts.filter(s => s.date === date);

    const handleAddShift = (templateId: string) => {
        if (!selectedDate) return;

        const newShift: Shift = {
            id: `shift-${Date.now()}`,
            date: selectedDate,
            templateId,
            volunteerName: '待分�?,
            status: 'scheduled'
        };
        setShifts([...shifts, newShift]);
    };

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

    return (
        <div className="shift-calendar-page">
            <div className="page-header">
                <h1>📅 排班日曆</h1>
                <p>視覺化管理志工排�?/p>
            </div>

            <div className="calendar-controls">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
                    ◀ 上個月
                </button>
                <h2>{monthName}</h2>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
                    下個月 �?
                </button>
            </div>

            <div className="template-legend">
                {templates.map(t => (
                    <span key={t.id} className="legend-item" style={{ borderColor: t.color }}>
                        <span className="legend-color" style={{ background: t.color }}></span>
                        {t.name} ({t.startTime}-{t.endTime})
                    </span>
                ))}
            </div>

            <div className="calendar-grid">
                <div className="weekday-header">
                    {['�?, '一', '�?, '�?, '�?, '�?, '�?].map(d => (
                        <div key={d} className="weekday">{d}</div>
                    ))}
                </div>
                <div className="days-grid">
                    {days.map((day, i) => {
                        const dateStr = formatDate(day);
                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                        const isToday = formatDate(new Date()) === dateStr;
                        const isSelected = selectedDate === dateStr;
                        const dayShifts = getShiftsForDate(dateStr);

                        return (
                            <div
                                key={i}
                                className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                                onClick={() => isCurrentMonth && setSelectedDate(dateStr)}
                            >
                                <span className="day-number">{day.getDate()}</span>
                                <div className="day-shifts">
                                    {dayShifts.map(s => {
                                        const template = templates.find(t => t.id === s.templateId);
                                        return (
                                            <div
                                                key={s.id}
                                                className="shift-badge"
                                                style={{ background: template?.color }}
                                            >
                                                {template?.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedDate && (
                <div className="shift-panel">
                    <h3>📋 {selectedDate} 排班</h3>
                    <div className="add-shift-buttons">
                        {templates.map(t => (
                            <button
                                key={t.id}
                                className="add-shift-btn"
                                style={{ background: t.color }}
                                onClick={() => handleAddShift(t.id)}
                            >
                                + {t.name}
                            </button>
                        ))}
                    </div>
                    <div className="day-shift-list">
                        {getShiftsForDate(selectedDate).map(s => {
                            const template = templates.find(t => t.id === s.templateId);
                            return (
                                <div key={s.id} className="shift-item" style={{ borderLeftColor: template?.color }}>
                                    <span className="shift-template">{template?.name}</span>
                                    <span className="shift-volunteer">{s.volunteerName}</span>
                                    <span className="shift-time">{template?.startTime} - {template?.endTime}</span>
                                </div>
                            );
                        })}
                        {getShiftsForDate(selectedDate).length === 0 && (
                            <p className="no-shifts">尚無排班</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftCalendarPage;
