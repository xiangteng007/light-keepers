import { useState, useEffect } from 'react';
import { SpreadsheetIcon, ExportIcon, PlusIcon } from '../../../design-system/icons';
import { Button, Badge } from '../../../design-system';
import EmptyState from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import './ReportsPage.css';

interface Report {
    id: string;
    name: string;
    type: 'mission' | 'resource' | 'volunteer' | 'analytics';
    generatedAt: string;
    status: 'ready' | 'generating' | 'failed';
    size: string;
}

const TYPE_LABEL: Record<Report['type'], string> = {
    mission: '任務',
    resource: '物資',
    volunteer: '志工',
    analytics: '分析',
};

function StatusBadge({ status }: { status: Report['status'] }) {
    if (status === 'ready') return <Badge variant="success" dot>已完成</Badge>;
    if (status === 'generating') return <Badge variant="warning" dot pulse>產生中</Badge>;
    return <Badge variant="danger" dot>失敗</Badge>;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setReports([
            { id: '1', name: 'Monthly Mission Summary - December 2024', type: 'mission', generatedAt: '2024-12-08 14:30', status: 'ready', size: '2.4 MB' },
            { id: '2', name: 'Resource Inventory Report Q4', type: 'resource', generatedAt: '2024-12-07 09:15', status: 'ready', size: '1.8 MB' },
            { id: '3', name: 'Volunteer Performance Analysis', type: 'volunteer', generatedAt: '2024-12-06 16:45', status: 'ready', size: '3.2 MB' },
            { id: '4', name: 'Weekly Analytics Dashboard', type: 'analytics', generatedAt: '2024-12-08 08:00', status: 'generating', size: '-' },
        ]);
        setLoading(false);
    }, []);

    const typeCounts = (['mission', 'resource', 'volunteer', 'analytics'] as const).map((type) => ({
        type,
        count: reports.filter((r) => r.type === type).length,
    }));

    return (
        <div className="reports-page">
            <header className="reports-page__header">
                <div>
                    <h1>報表中心</h1>
                    <p className="reports-page__subtitle">產生並下載系統報表</p>
                </div>
                <Button icon={<PlusIcon size={16} aria-hidden="true" />}>產生報表</Button>
            </header>

            <div className="reports-page__stats" role="list">
                {typeCounts.map(({ type, count }) => (
                    <div key={type} className="reports-page__stat" role="listitem">
                        <span className="reports-page__stat-label">{TYPE_LABEL[type]}報表</span>
                        <span className="reports-page__stat-value">{loading ? '—' : count}</span>
                    </div>
                ))}
            </div>

            <section className="reports-page__panel" aria-label="報表列表">
                {loading ? (
                    <div className="reports-page__skeleton">
                        <Skeleton variant="text" count={5} height={44} />
                    </div>
                ) : reports.length === 0 ? (
                    <EmptyState
                        title="尚無報表"
                        description="點擊「產生報表」建立第一份報表"
                        action={{ label: '產生報表', onClick: () => {} }}
                    />
                ) : (
                    <>
                        {/* 桌機：表格 */}
                        <table className="reports-table">
                            <thead>
                                <tr>
                                    <th scope="col">報表名稱</th>
                                    <th scope="col">類型</th>
                                    <th scope="col">產生時間</th>
                                    <th scope="col">大小</th>
                                    <th scope="col">狀態</th>
                                    <th scope="col">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report) => (
                                    <tr key={report.id}>
                                        <td className="reports-table__name">
                                            <SpreadsheetIcon size={16} aria-hidden="true" />
                                            {report.name}
                                        </td>
                                        <td>{TYPE_LABEL[report.type]}</td>
                                        <td className="tabular-nums">{report.generatedAt}</td>
                                        <td className="tabular-nums">{report.size}</td>
                                        <td><StatusBadge status={report.status} /></td>
                                        <td>
                                            {report.status === 'ready' ? (
                                                <button type="button" className="reports-table__download" aria-label={`下載 ${report.name}`}>
                                                    <ExportIcon size={16} aria-hidden="true" />
                                                    下載
                                                </button>
                                            ) : (
                                                <span className="reports-table__dash">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* 行動端：卡片直列 */}
                        <ul className="reports-cards" role="list">
                            {reports.map((report) => (
                                <li key={report.id} className="reports-card">
                                    <div className="reports-card__main">
                                        <span className="reports-card__name">{report.name}</span>
                                        <span className="reports-card__meta tabular-nums">
                                            {TYPE_LABEL[report.type]} · {report.generatedAt} · {report.size}
                                        </span>
                                    </div>
                                    <div className="reports-card__side">
                                        <StatusBadge status={report.status} />
                                        {report.status === 'ready' && (
                                            <button type="button" className="reports-table__download" aria-label={`下載 ${report.name}`}>
                                                <ExportIcon size={16} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>
        </div>
    );
}
