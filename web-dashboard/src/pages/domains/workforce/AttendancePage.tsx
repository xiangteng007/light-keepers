import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';
import { Alert } from '../../../design-system';
import './AttendancePage.css';

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
        const config: Record<string, { modifier: string; label: string }> = {
            present: { modifier: 'attendance-badge--present', label: '出席' },
            absent: { modifier: 'attendance-badge--absent', label: '缺席' },
            late: { modifier: 'attendance-badge--late', label: '遲到' },
            'early-leave': { modifier: 'attendance-badge--early-leave', label: '早退' },
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
        <div className="attendance-page">
            <div className="attendance-header">
                <div><h1 className="attendance-title">出勤追蹤</h1><p className="attendance-subtitle">志工簽到管理</p></div>
                <div className="attendance-controls">
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="attendance-date-input" aria-label="選擇日期" />
                    <button onClick={fetchRecords} disabled={loading} className="attendance-refresh-btn">
                        {loading ? '載入中...' : '重新整理'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && <Alert variant="danger">{error}</Alert>}

            <div className="attendance-stats-grid">
                <div className="attendance-stat-card"><p className="attendance-stat-label">總計</p><p className="attendance-stat-value">{stats.total}</p></div>
                <div className="attendance-stat-card"><p className="attendance-stat-label">出席</p><p className="attendance-stat-value attendance-stat-value--success">{stats.present}</p></div>
                <div className="attendance-stat-card"><p className="attendance-stat-label">缺席</p><p className="attendance-stat-value attendance-stat-value--danger">{stats.absent}</p></div>
                <div className="attendance-stat-card"><p className="attendance-stat-label">遲到</p><p className="attendance-stat-value attendance-stat-value--warning">{stats.late}</p></div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="attendance-loading">
                    載入中...
                </div>
            )}

            {!loading && (
                <div className="attendance-table-wrapper">
                    <table className="attendance-table">
                        <thead><tr className="attendance-table__head-row"><th className="attendance-table__th">志工</th><th className="attendance-table__th">簽到</th><th className="attendance-table__th">簽退</th><th className="attendance-table__th">時數</th><th className="attendance-table__th">狀態</th></tr></thead>
                        <tbody className="attendance-table__body">
                            {records.length === 0 ? (
                                <tr><td colSpan={5} className="attendance-empty-cell">暫無出勤記錄</td></tr>
                            ) : records.map((record) => {
                                const badge = getStatusBadge(record.status);
                                return (
                                    <tr key={record.id} className="attendance-table__row">
                                        <td><div className="attendance-name-cell"><div className="attendance-avatar">{record.volunteerName.charAt(0)}</div><span className="attendance-name-text">{record.volunteerName}</span></div></td>
                                        <td className="attendance-cell-muted">{record.checkIn || '-'}</td>
                                        <td className="attendance-cell-muted">{record.checkOut || '-'}</td>
                                        <td className="attendance-cell-muted">{record.hoursWorked}h</td>
                                        <td><span className={`attendance-badge ${badge.modifier}`}>{badge.label}</span></td>
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
