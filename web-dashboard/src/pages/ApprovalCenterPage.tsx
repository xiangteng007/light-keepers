/**
 * ApprovalCenterPage — 覆核中心
 * Migrated from react-bootstrap to project design system
 */

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../design-system';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import './ApprovalCenterPage.css';

// ============ Types ============

interface PendingApproval {
    id: string;
    resourceId: string;
    type: string;
    quantity: number;
    operatorName: string;
    recipientName: string;
    recipientPhone?: string;
    recipientOrg?: string;
    purpose: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    resource?: {
        name: string;
        controlLevel: 'controlled' | 'medical';
        category: string;
    };
}

type FilterType = 'all' | 'controlled' | 'medical';

// ============ Component ============

export default function ApprovalCenterPage() {
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sensitiveData, setSensitiveData] = useState<Record<string, string> | null>(null);

    const fetchPendingApprovals = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: Record<string, string> = filter !== 'all' ? { controlLevel: filter } : {};
            const response = await api.get('/approvals/pending', { params });
            setApprovals(response.data.transactions || []);
        } catch (err: unknown) {
            const errorMsg = getApiErrorMessage(err, '載入失敗');
            setError(errorMsg);
            console.error('Failed to fetch approvals:', err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchPendingApprovals();
    }, [fetchPendingApprovals]);

    const handleApprove = async (approvalId: string) => {
        if (!window.confirm('確定要通過此覆核嗎？通過後將扣除庫存。')) return;

        try {
            setActionLoading(true);
            await api.post(`/approvals/${approvalId}/approve`);
            alert('✅ 覆核通過！');
            fetchPendingApprovals();
            setShowDetailModal(false);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, '未知錯誤');
            alert(`❌ 覆核失敗：${msg}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedApproval) return;
        if (rejectReason.length < 5) {
            alert('拒絕原因必須至少 5 個字');
            return;
        }

        try {
            setActionLoading(true);
            await api.post(`/approvals/${selectedApproval.id}/reject`, {
                rejectReason,
            });
            alert('✅ 已拒絕覆核');
            fetchPendingApprovals();
            setShowRejectModal(false);
            setShowDetailModal(false);
            setRejectReason('');
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, '未知錯誤');
            alert(`❌ 拒絕失敗：${msg}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewSensitive = async (approvalId: string) => {
        try {
            const response = await api.post('/sensitive/read', {
                targetType: 'transaction',
                targetId: approvalId,
                fieldsAccessed: ['recipientName', 'recipientPhone', 'recipientIdNo', 'recipientOrg'],
                uiContext: 'approval_center_view_recipient',
                reasonCode: 'approval_review',
            });
            setSensitiveData(response.data.data);
            alert(`✅ 已記錄查閱（稽核 ID: ${response.data.auditLogId}）`);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, '權限不足');
            alert(`❌ 無權查看：${msg}`);
        }
    };

    const getControlBadge = (level: string) => {
        if (level === 'controlled') {
            return <span className="control-badge control-badge--controlled">管控</span>;
        }
        if (level === 'medical') {
            return <span className="control-badge control-badge--medical">藥品</span>;
        }
        return null;
    };

    const filters: { key: FilterType; label: string }[] = [
        { key: 'all', label: '全部' },
        { key: 'controlled', label: '管控物資' },
        { key: 'medical', label: '藥品' },
    ];

    return (
        <div className="page approval-page">
            {/* Header */}
            <div className="page-header">
                <h2>📋 覆核中心</h2>
                <div className="filter-pills">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            className={`filter-pill ${filter === f.key ? 'active' : ''}`}
                            data-filter={f.key}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="approval-alert approval-alert--danger">
                    ⚠️ {error}
                    <button className="alert-dismiss" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="approval-loading">
                    <div className="approval-spinner" />
                </div>
            ) : approvals.length === 0 ? (
                <div className="approval-alert approval-alert--info">
                    🎉 目前沒有待覆核的出庫單
                </div>
            ) : (
                /* Approval Cards */
                <div className="approval-grid">
                    {approvals.map((approval) => (
                        <div key={approval.id} className="approval-card">
                            <div className="approval-card__header">
                                <span className="approval-card__name">
                                    {approval.resource?.name}
                                </span>
                                {approval.resource?.controlLevel && getControlBadge(approval.resource.controlLevel)}
                            </div>
                            <div className="approval-card__body">
                                <div className="approval-card__field">
                                    <div className="approval-card__label">出庫數量</div>
                                    <div className="approval-card__value approval-card__value--quantity">
                                        {approval.quantity}
                                    </div>
                                </div>
                                <div className="approval-card__field">
                                    <div className="approval-card__label">領用人</div>
                                    <div className="approval-card__value">{approval.recipientName}</div>
                                </div>
                                <div className="approval-card__field">
                                    <div className="approval-card__label">用途</div>
                                    <div className="approval-card__value approval-card__value--truncate">
                                        {approval.purpose}
                                    </div>
                                </div>
                                <div className="approval-card__field">
                                    <div className="approval-card__label">申請人</div>
                                    <div className="approval-card__value">{approval.operatorName}</div>
                                </div>
                                <div className="approval-card__field">
                                    <div className="approval-card__label">申請時間</div>
                                    <div className="approval-card__value">
                                        {new Date(approval.createdAt).toLocaleString('zh-TW')}
                                    </div>
                                </div>
                            </div>
                            <div className="approval-card__footer">
                                <button
                                    className="approval-card__detail-btn"
                                    onClick={() => {
                                        setSelectedApproval(approval);
                                        setSensitiveData(null);
                                        setShowDetailModal(true);
                                    }}
                                >
                                    查看詳情
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="出庫單詳情"
                size="lg"
            >
                {selectedApproval && (
                    <div>
                        <div className="approval-card__field">
                            <h3>{selectedApproval.resource?.name}</h3>
                            {selectedApproval.resource?.controlLevel && getControlBadge(selectedApproval.resource.controlLevel)}
                        </div>

                        <table className="detail-table">
                            <tbody>
                                <tr>
                                    <th>出庫數量</th>
                                    <td><span className="quantity-value">{selectedApproval.quantity}</span></td>
                                </tr>
                                <tr>
                                    <th>領用人姓名</th>
                                    <td>{selectedApproval.recipientName}</td>
                                </tr>
                                <tr>
                                    <th>用途說明</th>
                                    <td>{selectedApproval.purpose}</td>
                                </tr>
                                <tr>
                                    <th>申請人</th>
                                    <td>{selectedApproval.operatorName}</td>
                                </tr>
                                <tr>
                                    <th>申請時間</th>
                                    <td>{new Date(selectedApproval.createdAt).toLocaleString('zh-TW')}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Sensitive Data Section */}
                        <div className="sensitive-section">
                            <div className="sensitive-header">
                                <h4>🔐 敏感資訊（需權限）</h4>
                                {!sensitiveData && (
                                    <button
                                        className="sensitive-btn"
                                        onClick={() => handleViewSensitive(selectedApproval.id)}
                                    >
                                        🔓 查看敏感資料（寫稽核）
                                    </button>
                                )}
                            </div>
                            {sensitiveData ? (
                                <table className="sensitive-table">
                                    <tbody>
                                        <tr>
                                            <th>領用人電話</th>
                                            <td>{sensitiveData.recipientPhone || '-'}</td>
                                        </tr>
                                        <tr>
                                            <th>領用人證件號</th>
                                            <td>{sensitiveData.recipientIdNo || '-'}</td>
                                        </tr>
                                        <tr>
                                            <th>領用人單位</th>
                                            <td>{sensitiveData.recipientOrg || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <div className="sensitive-notice">
                                    點擊按鈕後可查看敏感資料，所有查看動作皆會記錄稽核日誌
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="modal-actions">
                            <button
                                className="btn-close-modal"
                                onClick={() => setShowDetailModal(false)}
                            >
                                關閉
                            </button>
                            <button
                                className="btn-reject"
                                onClick={() => setShowRejectModal(true)}
                                disabled={actionLoading}
                            >
                                ❌ 拒絕覆核
                            </button>
                            <button
                                className="btn-approve"
                                onClick={() => selectedApproval && handleApprove(selectedApproval.id)}
                                disabled={actionLoading}
                            >
                                {actionLoading ? '處理中...' : '✅ 通過覆核'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                title="拒絕覆核"
            >
                <div className="reject-form">
                    <label htmlFor="reject-reason">拒絕原因（至少 5 個字）</label>
                    <textarea
                        id="reject-reason"
                        rows={3}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="請詳細說明拒絕原因，例如：庫存不足、用途不明確、領用人資訊有誤等"
                    />
                    <span className="char-count">已輸入 {rejectReason.length} 個字</span>
                </div>
                <div className="reject-actions">
                    <button className="btn-close-modal" onClick={() => setShowRejectModal(false)}>
                        取消
                    </button>
                    <button
                        className="btn-reject"
                        onClick={handleReject}
                        disabled={actionLoading || rejectReason.length < 5}
                    >
                        {actionLoading ? '處理中...' : '確認拒絕'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
