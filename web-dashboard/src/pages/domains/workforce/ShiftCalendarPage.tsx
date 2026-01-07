import { useState, useEffect } from 'react';

interface Shift { id: string; title: string; date: string; startTime: string; endTime: string; location: string; volunteers: string[]; capacity: number; type: 'regular' | 'emergency' | 'training'; }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

    const formatDateKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const getShiftTypeColor = (type: string) => type === 'emergency' ? 'bg-red-500' : type === 'training' ? 'bg-blue-500' : 'bg-green-500';

    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const shiftsForDate = (dateKey: string) => shifts.filter(s => s.date === dateKey);
    const selectedShifts = selectedDate ? shiftsForDate(selectedDate) : [];

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Shift Calendar</h1><p className="text-gray-400">Manage volunteer shifts</p></div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Add Shift</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-700 rounded">&lt;</button>
                        <h2 className="text-xl font-bold text-white">{MONTHS[month]} {year}</h2>
                        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-700 rounded">&gt;</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">{DAYS.map(day => <div key={day} className="text-center text-gray-400 text-sm py-2">{day}</div>)}</div>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startingDay }).map((_, i) => <div key={`e-${i}`} className="aspect-square"></div>)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1, dateKey = formatDateKey(year, month, day), dayShifts = shiftsForDate(dateKey), isSelected = selectedDate === dateKey;
                            return (
                                <button key={day} onClick={() => setSelectedDate(dateKey)} className={`aspect-square p-1 rounded-lg text-sm flex flex-col items-center justify-start ${isSelected ? 'bg-amber-500 text-black' : 'hover:bg-slate-700 text-gray-300'}`}>
                                    <span className="font-medium">{day}</span>
                                    {dayShifts.length > 0 && <div className="flex gap-0.5 mt-1">{dayShifts.slice(0, 3).map(s => <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${getShiftTypeColor(s.type)}`}></div>)}</div>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-gray-400">Regular</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-gray-400">Emergency</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-gray-400">Training</span></div>
                    </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                    <h3 className="text-lg font-medium text-white mb-4">{selectedDate ? `Shifts for ${selectedDate}` : 'Select a date'}</h3>
                    {selectedDate ? (selectedShifts.length > 0 ? (
                        <div className="space-y-3">{selectedShifts.map(shift => (
                            <div key={shift.id} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                                <div className="flex items-center gap-2 mb-2"><div className={`w-2 h-2 rounded-full ${getShiftTypeColor(shift.type)}`}></div><h4 className="text-white font-medium">{shift.title}</h4></div>
                                <p className="text-gray-400 text-sm">{shift.startTime} - {shift.endTime}</p>
                                <p className="text-gray-400 text-sm">{shift.location}</p>
                                <div className="mt-2 flex items-center justify-between"><span className="text-gray-400 text-sm">{shift.volunteers.length}/{shift.capacity}</span><button className="text-amber-400 text-sm hover:text-amber-300">Edit</button></div>
                            </div>
                        ))}</div>
                    ) : <p className="text-gray-400 text-center py-8">No shifts scheduled</p>) : <p className="text-gray-400 text-center py-8">Click a date to view shifts</p>}
                </div>
            </div>
        </div>
    );
}
