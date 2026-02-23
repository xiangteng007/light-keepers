import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';

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
    checkInTime?: string;
    checkOutTime?: string;
}

export default function AttendancePage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchRecords = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/attendance/daily-summary', {
                params: { date: selectedDate },
            });
            const data = response.data?.data || response.data || {};
            // Daily summary may return a summary object or records array
            const items = Array.isArray(data) ? data : (data.records || data.items || []);
            setRecords(items.map((r: any) => ({
                id: r.id || r._id || String(Math.random()),
                volunteerId: r.volunteerId || r.volunteer_id || '',
                volunteerName: r.volunteerName || r.volunteer_name || r.name || '未知',
                date: r.date || selectedDate,
                checkIn: r.checkIn || r.checkInTime || r.check_in || '',
                checkOut: r.checkOut || r.checkOutTime || r.check_out || null,
                location: r.location || r.locationName || '',
                status: r.status || 'present',
                hoursWorked: r.hoursWorked || r.hours_worked || r.totalHours || 0,
            })));
        } catch (err: any) {
            console.error('Failed to fetch attendance records:', err);
            setError(err?.response?.data?.message || '無法載入出勤記錄');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; label: string }> = {
            present: { bg: 'bg-green-500', label: '出席' },
            absent: { bg: 'bg-red-500', label: '缺席' },
            late: { bg: 'bg-yellow-500', label: '遲到' },
            'early-leave': { bg: 'bg-orange-500', label: '早退' },
        };
        return config[status] || config.present;
    };

    const stats = {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">出勤追蹤</h1><p className="text-gray-400">志工簽到管理</p></div>
                <div className="flex gap-4">
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" aria-label="選擇日期" />
                    <button onClick={fetchRecords} disabled={loading} className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50">
                        {loading ? '載入中...' : '重新整理'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                    ⚠️ {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">總計</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">出席</p><p className="text-2xl font-bold text-green-400">{stats.present}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">缺席</p><p className="text-2xl font-bold text-red-400">{stats.absent}</p></div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"><p className="text-gray-400 text-sm">遲到</p><p className="text-2xl font-bold text-yellow-400">{stats.late}</p></div>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#94a3b8' }}>
                    載入中...
                </div>
            )}

            {!loading && (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead><tr className="border-b border-slate-700"><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">志工</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">簽到</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">簽退</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">時數</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">狀態</th></tr></thead>
                        <tbody className="divide-y divide-slate-700">
                            {records.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>暫無出勤記錄</td></tr>
                            ) : records.map((record) => {
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
            )}
        </div>
    );
}
