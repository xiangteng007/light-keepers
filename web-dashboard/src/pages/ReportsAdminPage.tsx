import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, Card, Button, Badge, Modal } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import {
    DISASTER_TYPE_GROUPS,
    DISASTER_TYPE_META,
    MASS_CASUALTY_META,
} from '../constants/disasterTypes';
import { getReports, reviewReport } from '../api/services';
import type { Report, ReportStatus, ReportType, ReportSeverity } from '../api/services';
import './ReportsAdminPage.css';

// 回報類型設定
// CD-1: 改讀 disasterTypes SSOT（既有 8 類的 label/emoji/色碼在 SSOT 中逐字沿用
// 原值，本頁視覺輸出與擴充前相同）
const TYPE_CONFIG: Record<ReportType, { label: string; icon: string; color: string }> =
    Object.fromEntries(
        Object.entries(DISASTER_TYPE_META).map(([type, meta]) => [
            type,
            { label: meta.label, icon: meta.emoji, color: meta.color },
        ]),
    ) as Record<ReportType, { label: string; icon: string; color: string }>;

// 狀態設定
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: '待審核', color: 'var(--color-warning, #FF9800)' },
    confirmed: { label: '已確認', color: 'var(--color-success, #4CAF50)' },
    rejected: { label: '已駁回', color: 'var(--color-danger, #F44336)' },
};

// 嚴重程度設定
const SEVERITY_CONFIG: Record<ReportSeverity, { label: string; color: string }> = {
    low: { label: '低', color: 'var(--color-success, #4CAF50)' },
    medium: { label: '中', color: 'var(--color-warning, #FF9800)' },
    high: { label: '高', color: 'var(--color-danger, #F44336)' },
    critical: { label: '緊急', color: 'var(--color-critical, #9C27B0)' },
};

export default function ReportsAdminPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('pending');
    // CD-1: 災型與大量傷患篩選（空字串＝全部＝擴充前行為）
    const [selectedType, setSelectedType] = useState<string>('');
    const [massCasualtyOnly, setMassCasualtyOnly] = useState(false);
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
                type: (selectedType as ReportType) || undefined,
                isMassCasualty: massCasualtyOnly ? true : undefined,
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
    }, [selectedStatus, selectedType, massCasualtyOnly]);

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
            <header className="page-header">
                <div className="page-header__left">
                    <h1>回報審核管理</h1>
                    <p className="page-subtitle">管理員審核回報</p>
                </div>
            </header>

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

            {/* 篩選（toolbar） */}
            <div className="reports-filters" role="toolbar" aria-label="回報篩選">
                <button
                    className={`filter-btn ${selectedStatus === '' ? 'active' : ''}`}
                    onClick={() => setSelectedStatus('')}
                    aria-pressed={selectedStatus === ''}
                >
                    全部
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        className={`filter-btn ${selectedStatus === key ? 'active' : ''}`}
                        onClick={() => setSelectedStatus(key)}
                        aria-pressed={selectedStatus === key}
                    >
                        {config.label}
                    </button>
                ))}

                {/* CD-1: 災型篩選（民防類獨立分組，避免與天災混選） */}
                <select
                    className="filter-select"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    aria-label="災害類型篩選"
                >
                    <option value="">全部災型</option>
                    {DISASTER_TYPE_GROUPS.map((group) => (
                        <optgroup key={group.title} label={group.title}>
                            {group.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.emoji} {option.label}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>

                {/* CD-1: 大量傷患是跨災型旗標，因此是獨立開關而非災型選項 */}
                <label className="filter-checkbox">
                    <input
                        type="checkbox"
                        checked={massCasualtyOnly}
                        onChange={(e) => setMassCasualtyOnly(e.target.checked)}
                    />
                    {MASS_CASUALTY_META.emoji} 只看{MASS_CASUALTY_META.label}
                </label>
            </div>

            {/* 回報列表 */}
            <div className="reports-list">
                {isLoading ? (
                    <div aria-busy="true" aria-label="載入中">
                        <Skeleton variant="card" height={120} count={3} className="reports-list__skeleton-row" />
                    </div>
                ) : error ? (
                    <Alert variant="danger" icon={<AlertTriangle size={16} aria-hidden="true" />}>{error}</Alert>
                ) : reports.length === 0 ? (
                    <EmptyState variant="default" title="目前沒有回報" description="尚無符合篩選條件的回報。" />
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
                                    {report.isMassCasualty && (
                                        <span
                                            className="report-type"
                                            style={{ color: MASS_CASUALTY_META.color }}
                                        >
                                            {MASS_CASUALTY_META.emoji} {MASS_CASUALTY_META.label}
                                            {report.casualtyEstimate ? `（約 ${report.casualtyEstimate} 人）` : ''}
                                        </span>
                                    )}
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
                <Modal isOpen onClose={() => setSelectedReport(null)} title="審核回報" size="lg">
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
                </Modal>
            )}
        </div>
    );
}
