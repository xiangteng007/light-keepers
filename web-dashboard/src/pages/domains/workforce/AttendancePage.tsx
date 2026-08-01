import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, UserCheck, UserX, Clock } from 'lucide-react';
import api from '../../../api/client';
import { getApiErrorMessage } from '../../../api/errors';
import { Alert, Badge, Button, Card, StatIndicator } from '../../../design-system';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import EmptyState from '../../../components/shared/EmptyState';
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
            setError(getApiErrorMessage(err, '無法載入出勤記錄'));
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const getStatusBadge = (status: string): { variant: 'success' | 'danger' | 'warning'; label: string } => {
        const config: Record<string, { variant: 'success' | 'danger' | 'warning'; label: string }> = {
            present: { variant: 'success', label: '出席' },
            absent: { variant: 'danger', label: '缺席' },
            late: { variant: 'warning', label: '遲到' },
            'early-leave': { variant: 'warning', label: '早退' },
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
            <div className="page-header">
                <div className="page-header__titles">
                    <h1>出勤追蹤</h1>
                    <p className="page-header__subtitle">志工簽到管理</p>
                </div>
                <div className="attendance-controls">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="attendance-date-input"
                        aria-label="選擇日期"
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={fetchRecords}
                        disabled={loading}
                        icon={<RefreshCw size={16} aria-hidden="true" />}
                    >
                        {loading ? '載入中...' : '重新整理'}
                    </Button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="danger" title="載入失敗" className="attendance-alert">
                    <div className="attendance-alert__body">
                        <span>{error}</span>
                        <Button variant="secondary" size="sm" onClick={fetchRecords}>重試</Button>
                    </div>
                </Alert>
            )}

            {/* 統計摘要列 */}
            <div className="attendance-stats-grid">
                <Card padding="md" className="attendance-stat-card">
                    <StatIndicator icon={<Users size={20} aria-hidden="true" />} value={stats.total} label="總計" variant="default" />
                </Card>
                <Card padding="md" className="attendance-stat-card">
                    <StatIndicator icon={<UserCheck size={20} aria-hidden="true" />} value={stats.present} label="出席" variant="success" />
                </Card>
                <Card padding="md" className="attendance-stat-card">
                    <StatIndicator icon={<UserX size={20} aria-hidden="true" />} value={stats.absent} label="缺席" variant="danger" />
                </Card>
                <Card padding="md" className="attendance-stat-card">
                    <StatIndicator icon={<Clock size={20} aria-hidden="true" />} value={stats.late} label="遲到" variant="warning" />
                </Card>
            </div>

            {/* Loading */}
            {loading && (
                <div className="attendance-skeleton" role="status" aria-label="載入出勤記錄中">
                    <Skeleton variant="card" height={56} count={4} />
                </div>
            )}

            {!loading && records.length === 0 && (
                <EmptyState variant="minimal" title="暫無出勤記錄" description="請選擇其他日期，或稍後再試" />
            )}

            {!loading && records.length > 0 && (
                <>
                    {/* 桌機：表格 */}
                    <div className="attendance-table-wrapper">
                        <table className="attendance-table">
                            <thead>
                                <tr className="attendance-table__head-row">
                                    <th className="attendance-table__th">志工</th>
                                    <th className="attendance-table__th">簽到</th>
                                    <th className="attendance-table__th">簽退</th>
                                    <th className="attendance-table__th">時數</th>
                                    <th className="attendance-table__th">狀態</th>
                                </tr>
                            </thead>
                            <tbody className="attendance-table__body">
                                {records.map((record) => {
                                    const badge = getStatusBadge(record.status);
                                    return (
                                        <tr key={record.id} className="attendance-table__row">
                                            <td>
                                                <div className="attendance-name-cell">
                                                    <div className="attendance-avatar" aria-hidden="true">{record.volunteerName.charAt(0)}</div>
                                                    <span className="attendance-name-text">{record.volunteerName}</span>
                                                </div>
                                            </td>
                                            <td className="attendance-cell-muted attendance-cell-tabular">{record.checkIn || '-'}</td>
                                            <td className="attendance-cell-muted attendance-cell-tabular">{record.checkOut || '-'}</td>
                                            <td className="attendance-cell-muted attendance-cell-tabular">{record.hoursWorked}h</td>
                                            <td><Badge variant={badge.variant} size="sm">{badge.label}</Badge></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* 行動端：Card 直列 */}
                    <div className="attendance-card-list">
                        {records.map((record) => {
                            const badge = getStatusBadge(record.status);
                            return (
                                <Card key={record.id} padding="md" className="attendance-record-card">
                                    <div className="attendance-record-card__row">
                                        <div className="attendance-name-cell">
                                            <div className="attendance-avatar" aria-hidden="true">{record.volunteerName.charAt(0)}</div>
                                            <span className="attendance-name-text">{record.volunteerName}</span>
                                        </div>
                                        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                                    </div>
                                    <div className="attendance-record-card__meta">
                                        <span>簽到 {record.checkIn || '-'}</span>
                                        <span>簽退 {record.checkOut || '-'}</span>
                                        <span>{record.hoursWorked}h</span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
