import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../design-system';
import { getReports, reviewReport } from '../api/services';
import type { Report, ReportStatus, ReportType, ReportSeverity } from '../api/services';
import './ReportsAdminPage.css';

// 回報類型設定
const TYPE_CONFIG: Record<ReportType, { label: string; icon: string; color: string }> = {
    flood: { label: '淹水', icon: '🌊', color: '#2196F3' },
    landslide: { label: '土石流', icon: '⛰️', color: '#795548' },
    road_damage: { label: '道路損壞', icon: '🛣️', color: '#FF9800' },
    power_outage: { label: '停電', icon: '⚡', color: '#9C27B0' },
    water_outage: { label: '停水', icon: '💧', color: '#00BCD4' },
    building_damage: { label: '建物損壞', icon: '🏚️', color: '#F44336' },
    other: { label: '其他', icon: '📋', color: '#607D8B' },
};

// 狀態設定
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: '待審核', color: '#FF9800' },
    confirmed: { label: '已確認', color: '#4CAF50' },
    rejected: { label: '已駁回', color: '#F44336' },
};

// 嚴重程度設定
const SEVERITY_CONFIG: Record<ReportSeverity, { label: string; color: string }> = {
    low: { label: '低', color: '#4CAF50' },
    medium: { label: '中', color: '#FF9800' },
    high: { label: '高', color: '#F44336' },
    critical: { label: '緊急', color: '#9C27B0' },
};

export default function ReportsAdminPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('pending');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);

    // 載入回報列表
    const fetchReports = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getReports({
                status: selectedStatus as ReportStatus || undefined,
            });
            setReports(response.data.data);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
            setError('載入回報列表失敗');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [selectedStatus]);

    // 審核回報
    const handleReview = async (status: 'confirmed' | 'rejected') => {
        if (!selectedReport) return;
        setIsReviewing(true);
        try {
            await reviewReport(selectedReport.id, {
                status,
                reviewedBy: 'admin', // 實際應從 auth context 取得
                reviewNote: reviewNote || undefined,
            });
            setSelectedReport(null);
            setReviewNote('');
            fetchReports(); // 重新載入
        } catch (err) {
            console.error('Failed to review report:', err);
            alert('審核失敗，請稍後再試');
        } finally {
            setIsReviewing(false);
        }
    };

    // 統計
    const stats = {
        pending: reports.filter(r => r.status === 'pending').length,
        confirmed: reports.filter(r => r.status === 'confirmed').length,
        rejected: reports.filter(r => r.status === 'rejected').length,
    };

    return (
        <div className="page reports-admin-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📋 回報審核管理</h2>
                    <p className="page-subtitle">管理員審核回報</p>
                </div>
            </div>

            {/* 統計卡片 */}
            <div className="reports-stats">
                <Card className="stat-card stat-card--warning" padding="md">
                    <div className="stat-card__value">{stats.pending}</div>
                    <div className="stat-card__label">待審核</div>
                </Card>
                <Card className="stat-card stat-card--success" padding="md">
                    <div className="stat-card__value">{stats.confirmed}</div>
                    <div className="stat-card__label">已確認</div>
                </Card>
                <Card className="stat-card stat-card--danger" padding="md">
                    <div className="stat-card__value">{stats.rejected}</div>
                    <div className="stat-card__label">已駁回</div>
                </Card>
            </div>

            {/* 篩選 */}
            <div className="reports-filters">
                <button
                    className={`filter-btn ${selectedStatus === '' ? 'active' : ''}`}
                    onClick={() => setSelectedStatus('')}
                >
                    全部
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        className={`filter-btn ${selectedStatus === key ? 'active' : ''}`}
                        onClick={() => setSelectedStatus(key)}
                    >
                        {config.label}
                    </button>
                ))}
            </div>

            {/* 回報列表 */}
            <div className="reports-list">
                {isLoading ? (
                    <div className="loading-state">⏳ 載入中...</div>
                ) : error ? (
                    <div className="error-state">⚠️ {error}</div>
                ) : reports.length === 0 ? (
                    <div className="empty-state">📭 目前沒有回報</div>
                ) : (
                    reports.map(report => {
                        const typeConfig = TYPE_CONFIG[report.type] || TYPE_CONFIG.other;
                        const statusConfig = STATUS_CONFIG[report.status];
                        const severityConfig = SEVERITY_CONFIG[report.severity];
                        return (
                            <Card
                                key={report.id}
                                className={`report-card ${report.status === 'pending' ? 'report-card--pending' : ''}`}
                                padding="md"
                                onClick={() => setSelectedReport(report)}
                            >
                                <div className="report-card__header">
                                    <span className="report-type">
                                        {typeConfig.icon} {typeConfig.label}
                                    </span>
                                    <Badge
                                        variant={report.status === 'confirmed' ? 'success' :
                                            report.status === 'rejected' ? 'danger' : 'warning'}
                                    >
                                        {statusConfig.label}
                                    </Badge>
                                </div>
                                <p className="report-card__description">
                                    {report.description?.substring(0, 100)}...
                                </p>
                                <div className="report-card__meta">
                                    <span>📍 {report.address || '未提供地址'}</span>
                                    <span style={{ color: severityConfig.color }}>
                                        ⚠️ {severityConfig.label}
                                    </span>
                                    <span>🕐 {new Date(report.createdAt).toLocaleDateString('zh-TW')}</span>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* 審核 Modal */}
            {selectedReport && (
                <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                    <Card className="modal-content modal-content--lg" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>📋 審核回報</h3>

                        <div className="report-detail">
                            <div className="report-detail__row">
                                <span className="label">類型</span>
                                <span>{TYPE_CONFIG[selectedReport.type]?.icon} {TYPE_CONFIG[selectedReport.type]?.label}</span>
                            </div>
                            <div className="report-detail__row">
                                <span className="label">嚴重程度</span>
                                <Badge variant={selectedReport.severity === 'critical' ? 'danger' :
                                    selectedReport.severity === 'high' ? 'warning' : 'default'}>
                                    {SEVERITY_CONFIG[selectedReport.severity]?.label}
                                </Badge>
                            </div>
                            <div className="report-detail__row">
                                <span className="label">位置</span>
                                <span>{selectedReport.address || '未提供'}</span>
                            </div>
                            <div className="report-detail__row report-detail__row--full">
                                <span className="label">描述</span>
                                <p>{selectedReport.description}</p>
                            </div>
                            {selectedReport.photos && selectedReport.photos.length > 0 && (
                                <div className="report-detail__row report-detail__row--full">
                                    <span className="label">照片</span>
                                    <div className="report-photos">
                                        {selectedReport.photos.map((photo, idx) => (
                                            <img key={idx} src={photo} alt={`回報照片 ${idx + 1}`} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="review-form">
                            <label>審核備註 (選填)</label>
                            <textarea
                                value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)}
                                placeholder="輸入審核備註..."
                                rows={3}
                            />
                        </div>

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setSelectedReport(null)}>
                                取消
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => handleReview('rejected')}
                                disabled={isReviewing}
                            >
                                {isReviewing ? '處理中...' : '❌ 駁回'}
                            </Button>
                            <Button
                                onClick={() => handleReview('confirmed')}
                                disabled={isReviewing}
                            >
                                {isReviewing ? '處理中...' : '✅ 確認'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
