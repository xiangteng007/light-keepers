import { useState } from 'react';
import { Modal, Form, Button, Alert, Badge } from 'react-bootstrap';
import api from '../../utils/api';

interface InboundQrModalProps {
    show: boolean;
    onHide: () => void;
    resourceId: string;
    resourceName: string;
    controlLevel: 'civil' | 'controlled' | 'medical' | 'asset';
    onSuccess?: () => void;
}

/**
 * 入庫產碼彈窗
 * 僅適用於 controlled/medical/asset 品項
 */
export default function InboundQrModal({
    show,
    onHide,
    resourceId,
    resourceName,
    controlLevel,
    onSuccess,
}: InboundQrModalProps) {
    const [lotNumber, setLotNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [warehouseId, setWarehouseId] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedQr, setGeneratedQr] = useState<string | null>(null);

    // 檢查是否可以產碼
    const canGenerateQr = controlLevel !== 'civil';

    const handleGenerate = async () => {
        if (!canGenerateQr) {
            alert('❌ 民生物品不可產生系統 QR Code');
            return;
        }

        if ((controlLevel === 'controlled' || controlLevel === 'medical') && !lotNumber) {
            alert('❌ 管控/藥品必須填寫批號');
            return;
        }

        try {
            setLoading(true);

            // 呼叫批次創建 API
            const response = await api.post('/api/lots', {
                itemId: resourceId,
                lotNumber: lotNumber || `LOT-${Date.now()}`,
                expiryDate: expiryDate || null,
                quantity,
                warehouseId: warehouseId || null,
            });

            setGeneratedQr(response.data.qrValue);
            alert('✅ QR Code 已產生！');

            if (onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            alert(`❌ 產生失敗：${err.response?.data?.message || '未知錯誤'}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePrintLabel = async () => {
        if (!generatedQr) return;

        alert('🖨️ 貼紙列印功能開發中...\n將來會產生 PDF 並觸發列印');
        // TODO: 呼叫 /api/labels/generate/lot API
    };

    const handleReset = () => {
        setLotNumber('');
        setExpiryDate('');
        setQuantity(1);
        setWarehouseId('');
        setGeneratedQr(null);
    };

    const getControlLevelBadge = () => {
        const colors: Record<string, string> = {
            civil: 'secondary',
            controlled: 'warning',
            medical: 'danger',
            asset: 'primary',
        };
        const labels: Record<string, string> = {
            civil: '民生',
            controlled: '管控',
            medical: '藥品',
            asset: '資產',
        };
        return <Badge bg={colors[controlLevel]}>{labels[controlLevel]}</Badge>;
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    📦 入庫產碼 - {resourceName} {getControlLevelBadge()}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {!canGenerateQr ? (
                    <Alert variant="warning">
                        ⚠️ <strong>民生物品不可產生系統 QR Code</strong>
                        <div className="mt-2">
                            根據系統規範，僅 <Badge bg="warning">管控</Badge>、<Badge bg="danger">藥品</Badge>、<Badge bg="primary">資產</Badge> 品項可產生 QR Code 與貼紙。
                        </div>
                    </Alert>
                ) : generatedQr ? (
                    // QR 已產生
                    <div>
                        <Alert variant="success">
                            ✅ <strong>QR Code 已產生！</strong>
                        </Alert>
                        <div className="bg-light p-4 rounded text-center mb-3">
                            <div className="mb-3">
                                <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                    padding: '10px',
                                    background: 'white',
                                    border: '2px dashed #333',
                                    display: 'inline-block'
                                }}>
                                    {generatedQr}
                                </div>
                            </div>
                            <div className="text-muted small">
                                ℹ️ 實際部署時，此處會顯示可掃描的 QR Code 圖片
                            </div>
                        </div>

                        <table className="table table-bordered table-sm">
                            <tbody>
                                <tr>
                                    <th>批號</th>
                                    <td>{lotNumber}</td>
                                </tr>
                                <tr>
                                    <th>數量</th>
                                    <td>{quantity}</td>
                                </tr>
                                {expiryDate && (
                                    <tr>
                                        <th>效期</th>
                                        <td>{new Date(expiryDate).toLocaleDateString('zh-TW')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="d-grid gap-2">
                            <Button variant="primary" onClick={handlePrintLabel}>
                                🖨️ 列印貼紙
                            </Button>
                            <Button variant="outline-secondary" onClick={handleReset}>
                                產生新批次
                            </Button>
                        </div>
                    </div>
                ) : (
                    // 填寫表單
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                批號
                                {(controlLevel === 'controlled' || controlLevel === 'medical') &&
                                    <span className="text-danger"> *</span>
                                }
                            </Form.Label>
                            <Form.Control
                                type="text"
                                value={lotNumber}
                                onChange={(e) => setLotNumber(e.target.value)}
                                placeholder={
                                    controlLevel === 'controlled' || controlLevel === 'medical'
                                        ? '請輸入批號（必填）'
                                        : '選填（留空自動產生）'
                                }
                                required={controlLevel === 'controlled' || controlLevel === 'medical'}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>效期</Form.Label>
                            <Form.Control
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                選填（藥品建議填寫）
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>批次數量</Form.Label>
                            <Form.Control
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                        </Form.Group>

                        <Alert variant="info" className="mb-0">
                            <strong>ℹ️ QR Code 防偽機制</strong>
                            <div className="mt-1 small">
                                系統將使用 SHA256 演算法產生 8 位校驗碼，確保 QR Code 無法偽造。
                            </div>
                        </Alert>
                    </Form>
                )}
            </Modal.Body>
            <Modal.Footer>
                {!generatedQr && (
                    <>
                        <Button variant="secondary" onClick={onHide}>
                            取消
                        </Button>
                        {canGenerateQr && (
                            <Button
                                variant="success"
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? '產生中...' : '🔐 產生 QR Code'}
                            </Button>
                        )}
                    </>
                )}
                {generatedQr && (
                    <Button variant="secondary" onClick={onHide}>
                        關閉
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}
