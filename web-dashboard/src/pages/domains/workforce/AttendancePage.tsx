import { useState, useEffect } from 'react';

interface AttendanceRecord {
    id: string;
    volunteerId: string;
    volunteerName: string;
    date: string;
    checkIn: string;
    checkOut: string | null;
    location: string;
    status: 'present' | 'absent' | 'late' | 'early-leave';
    hoursWorked: number;
}

export default function AttendancePage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const mockData: AttendanceRecord[] = [
            { id: '1', volunteerId: '1', volunteerName: 'Wang Daming', date: '2024-12-10', checkIn: '08:00', checkOut: '17:00', location: 'HQ', status: 'present', hoursWorked: 9 },
            { id: '2', volunteerId: '2', volunteerName: 'Lin Xiaohua', date: '2024-12-10', checkIn: '08:30', checkOut: '17:00', location: 'North Station', status: 'late', hoursWorked: 8.5 },
            { id: '3', volunteerId: '3', volunteerName: 'Chen Zhiqiang', date: '2024-12-10', checkIn: '08:00', checkOut: '14:00', location: 'South Base', status: 'early-leave', hoursWorked: 6 },
            { id: '4', volunteerId: '4', volunteerName: 'Zhang Wei', date: '2024-12-10', checkIn: '', checkOut: null, location: '', status: 'absent', hoursWorked: 0 },
        ];
        setRecords(mockData);
        setLoading(false);
    }, [selectedDate]);

    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; label: string }> = {
            present: { bg: 'bg-green-500', label: 'Present' },
            absent: { bg: 'bg-red-500', label: 'Absent' },
            late: { bg: 'bg-yellow-500', label: 'Late' },
            'early-leave': { bg: 'bg-orange-500', label: 'Early Leave' },
        };
        return config[status] || config.present;
    };

    const stats = {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">Attendance Tracking</h1><p className="text-gray-400">Monitor volunteer check-ins</p></div>
                <div className="flex gap-4">
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" aria-label="Select date" />
                    <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">Export</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">Present</p><p className="text-2xl font-bold text-green-400">{stats.present}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">Absent</p><p className="text-2xl font-bold text-red-400">{stats.absent}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">Late</p><p className="text-2xl font-bold text-yellow-400">{stats.late}</p></div>
            </div>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Volunteer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Check In</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Check Out</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hours</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-700">
                        {records.map((record) => {
                            const badge = getStatusBadge(record.status);
                            return (
                                <tr key={record.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4"><div className="flex items-center"><div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-medium text-sm">{record.volunteerName.charAt(0)}</div><span className="ml-3 text-white">{record.volunteerName}</span></div></td>
                                    <td className="px-6 py-4 text-gray-300">{record.checkIn || '-'}</td>
                                    <td className="px-6 py-4 text-gray-300">{record.checkOut || '-'}</td>
                                    <td className="px-6 py-4 text-gray-300">{record.hoursWorked}h</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full text-white ${badge.bg}`}>{badge.label}</span></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
