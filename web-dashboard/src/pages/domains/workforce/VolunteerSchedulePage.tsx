import { useState, useEffect } from 'react';

interface ScheduleEntry {
    id: string;
    volunteerId: string;
    volunteerName: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    task: string;
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

export default function VolunteerSchedulePage() {
    const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const mockData: ScheduleEntry[] = [
            { id: '1', volunteerId: '1', volunteerName: 'Wang Daming', date: '2024-12-10', startTime: '08:00', endTime: '12:00', location: 'HQ', task: 'Morning Patrol', status: 'confirmed' },
            { id: '2', volunteerId: '2', volunteerName: 'Lin Xiaohua', date: '2024-12-10', startTime: '12:00', endTime: '18:00', location: 'North Station', task: 'Afternoon Shift', status: 'scheduled' },
            { id: '3', volunteerId: '3', volunteerName: 'Chen Zhiqiang', date: '2024-12-10', startTime: '18:00', endTime: '22:00', location: 'South Base', task: 'Evening Watch', status: 'scheduled' },
            { id: '4', volunteerId: '1', volunteerName: 'Wang Daming', date: '2024-12-11', startTime: '09:00', endTime: '17:00', location: 'Training Center', task: 'Training Session', status: 'confirmed' },
        ];
        setSchedules(mockData);
        setLoading(false);
    }, []);

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            scheduled: 'bg-blue-500',
            confirmed: 'bg-green-500',
            completed: 'bg-gray-500',
            cancelled: 'bg-red-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    const filteredSchedules = schedules.filter(s => s.date === selectedDate);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Volunteer Schedule</h1>
                    <p className="text-gray-400">Manage volunteer shift assignments</p>
                </div>
                <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">
                    Add Schedule
                </button>
            </div>

            <div className="flex items-center gap-4">
                <label className="text-gray-400" htmlFor="date-picker">Select Date:</label>
                <input
                    id="date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
            </div>

            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Volunteer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Task</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredSchedules.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    No schedules for this date
                                </td>
                            </tr>
                        ) : (
                            filteredSchedules.map((schedule) => (
                                <tr key={schedule.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4 text-white">{schedule.startTime} - {schedule.endTime}</td>
                                    <td className="px-6 py-4 text-gray-300">{schedule.volunteerName}</td>
                                    <td className="px-6 py-4 text-gray-300">{schedule.task}</td>
                                    <td className="px-6 py-4 text-gray-300">{schedule.location}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full text-white ${getStatusBadge(schedule.status)}`}>
                                            {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-amber-400 hover:text-amber-300 text-sm">Edit</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
