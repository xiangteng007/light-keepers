import { useState, useEffect } from 'react';
import { ExportIcon } from '../../../design-system/icons';
import { Badge, Button } from '../../../design-system';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import EmptyState from '../../../components/shared/EmptyState';
import './PointsReportPage.css';

interface PointsRecord { id: string; volunteerId: string; volunteerName: string; points: number; reason: string; date: string; type: 'earned' | 'redeemed'; }
interface VolunteerPoints { volunteerId: string; name: string; totalPoints: number; thisMonth: number; rank: number; }

const TABS: Array<{ id: 'leaderboard' | 'history'; label: string }> = [
    { id: 'leaderboard', label: '排行榜' },
    { id: 'history', label: '歷史紀錄' },
];

export default function PointsReportPage() {
    const [leaderboard, setLeaderboard] = useState<VolunteerPoints[]>([]);
    const [records, setRecords] = useState<PointsRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard');

    useEffect(() => {
        setLeaderboard([
            { volunteerId: '1', name: 'Wang Daming', totalPoints: 2450, thisMonth: 320, rank: 1 },
            { volunteerId: '2', name: 'Lin Xiaohua', totalPoints: 2180, thisMonth: 280, rank: 2 },
            { volunteerId: '3', name: 'Chen Zhiqiang', totalPoints: 1920, thisMonth: 250, rank: 3 },
        ]);
        setRecords([
            { id: '1', volunteerId: '1', volunteerName: 'Wang Daming', points: 50, reason: 'Mission completed', date: '2024-12-08', type: 'earned' },
            { id: '2', volunteerId: '2', volunteerName: 'Lin Xiaohua', points: 30, reason: 'Training attendance', date: '2024-12-07', type: 'earned' },
            { id: '3', volunteerId: '1', volunteerName: 'Wang Daming', points: -50, reason: 'Gift redemption', date: '2024-12-05', type: 'redeemed' },
        ]);
        setLoading(false);
    }, []);

    const getRankModifier = (rank: number) => {
        switch (rank) {
            case 1: return 'points-rank--gold';
            case 2: return 'points-rank--silver';
            case 3: return 'points-rank--bronze';
            default: return 'points-rank--default';
        }
    };

    return (
        <div className="points-report-page">
            <div className="page-header">
                <div className="page-header__titles">
                    <h1>積分報表</h1>
                    <p className="page-header__subtitle">志工積分認可追蹤</p>
                </div>
                <Button variant="primary" size="sm" icon={<ExportIcon size={16} aria-hidden="true" />}>
                    匯出報表
                </Button>
            </div>

            <div className="points-report-tabs" role="tablist" aria-label="報表檢視">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`points-report-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="points-report-skeleton" role="status" aria-label="載入積分報表中">
                    <Skeleton variant="card" height={48} count={4} />
                </div>
            )}

            {!loading && activeTab === 'leaderboard' && (
                leaderboard.length === 0 ? (
                    <EmptyState variant="minimal" title="暫無排行資料" />
                ) : (
                    <div className="points-report-table-wrapper">
                        <table className="points-report-table">
                            <thead>
                                <tr>
                                    <th>名次</th>
                                    <th>志工</th>
                                    <th>本月</th>
                                    <th>總積分</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((v) => (
                                    <tr key={v.volunteerId}>
                                        <td>
                                            <span className={`points-rank ${getRankModifier(v.rank)}`}>{v.rank}</span>
                                        </td>
                                        <td className="points-report-table__name">{v.name}</td>
                                        <td className="points-report-table__num">+{v.thisMonth}</td>
                                        <td className="points-report-table__num points-report-table__points">{v.totalPoints.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {!loading && activeTab === 'history' && (
                records.length === 0 ? (
                    <EmptyState variant="minimal" title="暫無歷史紀錄" />
                ) : (
                    <div className="points-report-table-wrapper">
                        <table className="points-report-table">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>志工</th>
                                    <th>原因</th>
                                    <th>積分</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r) => (
                                    <tr key={r.id}>
                                        <td className="points-report-table__num">{r.date}</td>
                                        <td className="points-report-table__name">{r.volunteerName}</td>
                                        <td className="points-report-table__reason">
                                            {r.reason}
                                            <Badge variant={r.type === 'earned' ? 'success' : 'default'} size="sm" className="points-report-table__type-badge">
                                                {r.type === 'earned' ? '獲得' : '兌換'}
                                            </Badge>
                                        </td>
                                        <td className="points-report-table__num points-report-table__points">
                                            {r.type === 'earned' ? '+' : ''}{r.points}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
