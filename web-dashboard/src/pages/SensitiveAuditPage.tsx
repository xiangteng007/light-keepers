import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Badge, Table } from 'react-bootstrap';
import { SearchIcon } from '../design-system/icons';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';

interface SensitiveReadLog {
    id: string;
    actorUid: string;
    actorRole: string;
    targetType: string;
    targetId: string;
    fieldsAccessed: string[];
    uiContext: string;
    reasonCode: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    denialReason?: string;
    createdAt: string;
}

interface LabelPrintLog {
    id: string;
    actorUid: string;
    actorRole: string;
    action: 'generate' | 'print' | 'reprint' | 'revoke';
    targetType: string;
    targetIds: string[];
    controlLevel: string;
    templateId: string;
    labelCount: number;
    revokeReason?: string;
    createdAt: string;
}

/**
 * 敏感稽核查詢頁（幹部專用）
 * 查詢所有敏感資料讀取與貼紙列印稽核日誌
 */
export default function SensitiveAuditPage() {
    const [activeTab, setActiveTab] = useState<'read' | 'print'>('read');
    const [readLogs, setReadLogs] = useState<SensitiveReadLog[]>([]);
    const [printLogs, setPrintLogs] = useState<LabelPrintLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 篩選條件
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [actorUid, setActorUid] = useState('');
    const [targetType, setTargetType] = useState('');

    useEffect(() => {
        if (activeTab === 'read') {
            fetchReadLogs();
        } else {
            fetchPrintLogs();
        }
    }, [activeTab]);

    const fetchReadLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.post('/sensitive/audit-logs', {
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                actorUid: actorUid || undefined,
                targetType: targetType || undefined,
                limit: 100,
            });
            setReadLogs(response.data.logs || []);
        } catch (err: any) {
            setError(getApiErrorMessage(err, '載入失敗'));
        } finally {
            setLoading(false);
        }
    };

    const fetchPrintLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/labels/audit-logs', {
                params: {
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    actorUid: actorUid || undefined,
                    limit: 100,
                },
            });
            setPrintLogs(response.data.logs || []);
        } catch (err: any) {
            setError(getApiErrorMessage(err, '載入失敗'));
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (activeTab === 'read') {
            fetchReadLogs();
        } else {
            fetchPrintLogs();
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="mb-4">
                <h2><SearchIcon size={20} aria-hidden="true" /> 敏感稽核查詢</h2>
                <p className="text-muted">
                    查看所有敏感資料讀取與貼紙列印稽核日誌（幹部專用）
                </p>
            </div>

            {/* 篩選條件 */}
            <Card className="mb-4">
                <Card.Body>
                    <Form>
                        <div className="row g-3">
                            <Form.Group className="col-md-3" controlId="sensitive-audit-date-from">
                                <Form.Label>起始日期</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="col-md-3" controlId="sensitive-audit-date-to">
                                <Form.Label>結束日期</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="col-md-3" controlId="sensitive-audit-actor-uid">
                                <Form.Label>操作者 UID</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={actorUid}
                                    onChange={(e) => setActorUid(e.target.value)}
                                    placeholder="選填"
                                />
                            </Form.Group>
                            {activeTab === 'read' && (
                                <Form.Group className="col-md-3" controlId="sensitive-audit-target-type">
                                    <Form.Label>目標類型</Form.Label>
                                    <Form.Select
                                        value={targetType}
                                        onChange={(e) => setTargetType(e.target.value)}
                                    >
                                        <option value="">全部</option>
                                        <option value="transaction">交易</option>
                                        <option value="asset">資產</option>
                                        <option value="resource">物資</option>
                                    </Form.Select>
                                </Form.Group>
                            )}
                        </div>
                        <div className="mt-3">
                            <Button variant="primary" onClick={handleSearch}>
                                <SearchIcon size={16} aria-hidden="true" /> 查詢
                            </Button>
                            <Button
                                variant="outline-secondary"
                                className="ms-2"
                                onClick={() => {
                                    setDateFrom('');
                                    setDateTo('');
                                    setActorUid('');
                                    setTargetType('');
                                }}
                            >
                                清除條件
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            {/* Tab 切換 */}
            <div className="btn-group mb-3" role="group" aria-label="稽核日誌類型切換">
                <Button
                    variant={activeTab === 'read' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('read')}
                    aria-pressed={activeTab === 'read'}
                >
                    敏感資料讀取
                </Button>
                <Button
                    variant={activeTab === 'print' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('print')}
                    aria-pressed={activeTab === 'print'}
                >
                    貼紙列印
                </Button>
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
            ) : (
                <Card>
                    <Card.Body>
                        {activeTab === 'read' ? (
                            // 敏感資料讀取日誌
                            readLogs.length === 0 ? (
                                <Alert variant="info">目前沒有敏感資料讀取記錄</Alert>
                            ) : (
                                <div className="table-responsive">
                                    <Table striped bordered hover size="sm">
                                        <thead>
                                            <tr>
                                                <th>時間</th>
                                                <th>操作者</th>
                                                <th>角色</th>
                                                <th>目標</th>
                                                <th>欄位</th>
                                                <th>原因</th>
                                                <th>狀態</th>
                                                <th>IP</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {readLogs.map((log) => (
                                                <tr key={log.id}>
                                                    <td className="text-nowrap">
                                                        {new Date(log.createdAt).toLocaleString('zh-TW')}
                                                    </td>
                                                    <td>{log.actorUid.substring(0, 8)}...</td>
                                                    <td>
                                                        <Badge bg="secondary">{log.actorRole}</Badge>
                                                    </td>
                                                    <td>
                                                        <div className="small">
                                                            <div>{log.targetType}</div>
                                                            <div className="text-muted">
                                                                {log.targetId.substring(0, 8)}...
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="small">
                                                            {log.fieldsAccessed.join(', ')}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="small">{log.reasonCode}</div>
                                                    </td>
                                                    <td>
                                                        {log.success ? (
                                                            <Badge bg="success">成功</Badge>
                                                        ) : (
                                                            <Badge bg="danger" title={log.denialReason}>
                                                                拒絕
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="small text-muted">{log.ipAddress}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )
                        ) : (
                            // 貼紙列印日誌
                            printLogs.length === 0 ? (
                                <Alert variant="info">目前沒有貼紙列印記錄</Alert>
                            ) : (
                                <div className="table-responsive">
                                    <Table striped bordered hover size="sm">
                                        <thead>
                                            <tr>
                                                <th>時間</th>
                                                <th>操作者</th>
                                                <th>角色</th>
                                                <th>動作</th>
                                                <th>目標類型</th>
                                                <th>管控等級</th>
                                                <th>數量</th>
                                                <th>備註</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {printLogs.map((log) => (
                                                <tr key={log.id}>
                                                    <td className="text-nowrap">
                                                        {new Date(log.createdAt).toLocaleString('zh-TW')}
                                                    </td>
                                                    <td>{log.actorUid.substring(0, 8)}...</td>
                                                    <td>
                                                        <Badge bg="secondary">{log.actorRole}</Badge>
                                                    </td>
                                                    <td>
                                                        <Badge
                                                            bg={
                                                                log.action === 'generate'
                                                                    ? 'primary'
                                                                    : log.action === 'print'
                                                                        ? 'success'
                                                                        : log.action === 'reprint'
                                                                            ? 'warning'
                                                                            : 'danger'
                                                            }
                                                        >
                                                            {log.action}
                                                        </Badge>
                                                    </td>
                                                    <td>{log.targetType}</td>
                                                    <td>
                                                        <Badge
                                                            bg={
                                                                log.controlLevel === 'controlled'
                                                                    ? 'warning'
                                                                    : log.controlLevel === 'medical'
                                                                        ? 'danger'
                                                                        : 'primary'
                                                            }
                                                        >
                                                            {log.controlLevel}
                                                        </Badge>
                                                    </td>
                                                    <td>{log.labelCount}</td>
                                                    <td className="small">{log.revokeReason || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )
                        )}
                    </Card.Body>
                </Card>
            )}
        </div>
    );
}
