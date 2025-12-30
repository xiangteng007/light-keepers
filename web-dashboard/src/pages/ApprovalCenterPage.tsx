import { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, Form, Alert } from 'react-bootstrap';
import api from '../utils/api';

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

export default function ApprovalCenterPage() {
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [filter, setFilter] = useState<'all' | 'controlled' | 'medical'>('all');
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sensitiveData, setSensitiveData] = useState<any>(null);

    useEffect(() => {
        fetchPendingApprovals();
    }, [filter]);

    const fetchPendingApprovals = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = filter !== 'all' ? { controlLevel: filter } : {};
            const response = await api.get('/approvals/pending', { params });
            setApprovals(response.data.transactions || []);
        } catch (err: any) {
            setError(err.response?.data?.message || '載入失敗');
            console.error('Failed to fetch approvals:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (approvalId: string) => {
        if (!window.confirm('確定要通過此覆核嗎？通過後將扣除庫存。')) return;

        try {
            setActionLoading(true);
            await api.post(`/approvals/${approvalId}/approve`);
            alert('✅ 覆核通過！');
            fetchPendingApprovals();
            setShowDetailModal(false);
        } catch (err: any) {
            alert(`❌ 覆核失敗：${err.response?.data?.message || '未知錯誤'}`);
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
        } catch (err: any) {
            alert(`❌ 拒絕失敗：${err.response?.data?.message || '未知錯誤'}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewSensitive = async (approvalId: string) => {
        try {
            // 透過敏感資料 API 讀取（會寫入稽核日誌）
            const response = await api.post('/sensitive/read', {
                targetType: 'transaction',
                targetId: approvalId,
                fieldsAccessed: ['recipientName', 'recipientPhone', 'recipientIdNo', 'recipientOrg'],
                uiContext: 'approval_center_view_recipient',
                reasonCode: 'approval_review',
            });
            setSensitiveData(response.data.data);
            alert(`✅ 已記錄查閱（稽核 ID: ${response.data.auditLogId}）`);
        } catch (err: any) {
            alert(`❌ 無權查看：${err.response?.data?.message || '權限不足'}`);
        }
    };

    const getControlLevelBadge = (level: string) => {
        const colors: Record<string, string> = {
            controlled: 'warning',
            medical: 'danger',
        };
        const labels: Record<string, string> = {
            controlled: '管控',
            medical: '藥品',
        };
        return <Badge bg={colors[level]}>{labels[level]}</Badge>;
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>📋 覆核中心</h2>
                <div className="btn-group">
                    <Button
                        variant={filter === 'all' ? 'primary' : 'outline-primary'}
                        onClick={() => setFilter('all')}
                    >
                        全部
                    </Button>
                    <Button
                        variant={filter === 'controlled' ? 'warning' : 'outline-warning'}
                        onClick={() => setFilter('controlled')}
                    >
                        管控物資
                    </Button>
                    <Button
                        variant={filter === 'medical' ? 'danger' : 'outline-danger'}
                        onClick={() => setFilter('medical')}
                    >
                        藥品
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">載入中...</span>
                    </div>
                </div>
            ) : approvals.length === 0 ? (
                <Alert variant="info">
                    🎉 目前沒有待覆核的出庫單
                </Alert>
            ) : (
                <div className="row g-3">
                    {approvals.map((approval) => (
                        <div key={approval.id} className="col-md-6 col-lg-4">
                            <Card className="shadow-sm h-100">
                                <Card.Header className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold">{approval.resource?.name}</span>
                                    {approval.resource?.controlLevel && getControlLevelBadge(approval.resource.controlLevel)}
                                </Card.Header>
                                <Card.Body>
                                    <div className="mb-2">
                                        <small className="text-muted">出庫數量</small>
                                        <div className="fs-4 fw-bold text-primary">{approval.quantity}</div>
                                    </div>
                                    <div className="mb-2">
                                        <small className="text-muted">領用人</small>
                                        <div>{approval.recipientName}</div>
                                    </div>
                                    <div className="mb-2">
                                        <small className="text-muted">用途</small>
                                        <div className="text-truncate">{approval.purpose}</div>
                                    </div>
                                    <div className="mb-2">
                                        <small className="text-muted">申請人</small>
                                        <div>{approval.operatorName}</div>
                                    </div>
                                    <div className="mb-3">
                                        <small className="text-muted">申請時間</small>
                                        <div>{new Date(approval.createdAt).toLocaleString('zh-TW')}</div>
                                    </div>
                                    <div className="d-grid gap-2">
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedApproval(approval);
                                                setSensitiveData(null);
                                                setShowDetailModal(true);
                                            }}
                                        >
                                            查看詳情
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* 詳情彈窗 */}
            <Modal
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>出庫單詳情</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedApproval && (
                        <div>
                            <div className="mb-3">
                                <h5>{selectedApproval.resource?.name}</h5>
                                {selectedApproval.resource?.controlLevel && getControlLevelBadge(selectedApproval.resource.controlLevel)}
                            </div>

                            <table className="table table-bordered">
                                <tbody>
                                    <tr>
                                        <th>出庫數量</th>
                                        <td><strong className="text-primary fs-5">{selectedApproval.quantity}</strong></td>
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

                            {/* 敏感資料區塊 */}
                            <div className="bg-light p-3 rounded mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="mb-0">🔐 敏感資訊（需權限）</h6>
                                    {!sensitiveData && (
                                        <Button
                                            variant="warning"
                                            size="sm"
                                            onClick={() => handleViewSensitive(selectedApproval.id)}
                                        >
                                            🔓 查看敏感資料（寫稽核）
                                        </Button>
                                    )}
                                </div>
                                {sensitiveData ? (
                                    <table className="table table-sm table-bordered bg-white mt-2">
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
                                    <Alert variant="secondary" className="mb-0 mt-2">
                                        點擊按鈕後可查看敏感資料，所有查看動作皆會記錄稽核日誌
                                    </Alert>
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowDetailModal(false)}
                    >
                        關閉
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => {
                            setShowRejectModal(true);
                        }}
                        disabled={actionLoading}
                    >
                        ❌ 拒絕覆核
                    </Button>
                    <Button
                        variant="success"
                        onClick={() => selectedApproval && handleApprove(selectedApproval.id)}
                        disabled={actionLoading}
                    >
                        {actionLoading ? '處理中...' : '✅ 通過覆核'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 拒絕原因彈窗 */}
            <Modal
                show={showRejectModal}
                onHide={() => setShowRejectModal(false)}
            >
                <Modal.Header closeButton>
                    <Modal.Title>拒絕覆核</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>拒絕原因（至少 5 個字）</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={rejectReason}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                            placeholder="請詳細說明拒絕原因，例如：庫存不足、用途不明確、領用人資訊有誤等"
                        />
                        <Form.Text className="text-muted">
                            已輸入 {rejectReason.length} 個字
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                        取消
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleReject}
                        disabled={actionLoading || rejectReason.length < 5}
                    >
                        {actionLoading ? '處理中...' : '確認拒絕'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
