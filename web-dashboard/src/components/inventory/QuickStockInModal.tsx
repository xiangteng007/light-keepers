import { useState, useCallback } from 'react';
import { WarningIcon, CheckIcon, InfoIcon, CloseIcon } from '../../design-system/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Badge } from '../../design-system';
import { BarcodeScanner } from '../barcode';
import { getResourceByBarcode, addStock, type Resource } from '../../api';
import './QuickStockInModal.css';

interface QuickStockInModalProps {
    isOpen: boolean;
    onClose: () => void;
    operatorName: string;
}

type ScanState = 'scanning' | 'found' | 'not-found' | 'success' | 'error';

export function QuickStockInModal({ isOpen, onClose, operatorName }: QuickStockInModalProps) {
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [foundResource, setFoundResource] = useState<Resource | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const queryClient = useQueryClient();

    // 入庫 Mutation
    const stockInMutation = useMutation({
        mutationFn: async () => {
            if (!foundResource) throw new Error('未找到物資');
            return addStock(foundResource.id, quantity, operatorName, notes || undefined);
        },
        onSuccess: () => {
            setScanState('success');
            queryClient.invalidateQueries({ queryKey: ['resources'] });
        },
        onError: (err: Error) => {
            setError(err.message);
            setScanState('error');
        },
    });

    // 處理條碼掃描成功
    const handleScan = useCallback(async (decodedText: string) => {
        setScannedBarcode(decodedText);
        setError('');

        try {
            const response = await getResourceByBarcode(decodedText);
            if (response.data) {
                setFoundResource(response.data as Resource);
                setScanState('found');
                // 預設入庫數量 1
                setQuantity(1);
                setNotes('');
            } else {
                setScanState('not-found');
            }
        } catch {
            setScanState('not-found');
        }
    }, []);

    // 確認入庫
    const handleConfirmStockIn = useCallback(() => {
        if (quantity <= 0) {
            setError('入庫數量必須大於 0');
            return;
        }
        stockInMutation.mutate();
    }, [quantity, stockInMutation]);

    // 繼續掃描
    const handleContinueScan = useCallback(() => {
        setScanState('scanning');
        setScannedBarcode('');
        setFoundResource(null);
        setQuantity(1);
        setNotes('');
        setError('');
    }, []);

    // 關閉並重設
    const handleClose = useCallback(() => {
        handleContinueScan();
        onClose();
    }, [onClose, handleContinueScan]);

    // 獲取類別標籤
    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            food: '食品',
            water: '飲用水',
            medical: '醫療',
            shelter: '收容',
            clothing: '衣物',
            equipment: '設備',
            other: '其他',
        };
        return labels[category] || category;
    };

    // 獲取狀態標籤
    const getStatusBadge = (status: string) => {
        const config: Record<string, { variant: 'success' | 'warning' | 'danger'; text: string }> = {
            available: { variant: 'success', text: '充足' },
            low: { variant: 'warning', text: '低庫存' },
            depleted: { variant: 'danger', text: '缺貨' },
        };
        return config[status] || { variant: 'success', text: status };
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="條碼掃描入庫"
            size="md"
        >
            <div className="quick-stock-in-content">
                {/* 掃描中 */}
                {scanState === 'scanning' && (
                    <BarcodeScanner
                        onScan={handleScan}
                        onError={(err) => setError(err)}
                        title="掃描物資條碼"
                        width={350}
                        height={280}
                    />
                )}

                {/* 找到物資 */}
                {scanState === 'found' && foundResource && (
                    <div className="quick-stock-in-found">
                        <div className="quick-stock-in-resource-info">
                            <div className="quick-stock-in-resource-header">
                                <h4>{foundResource.name}</h4>
                                <Badge variant={getStatusBadge(foundResource.status).variant}>
                                    {getStatusBadge(foundResource.status).text}
                                </Badge>
                            </div>
                            <div className="quick-stock-in-resource-details">
                                <span>類別：{getCategoryLabel(foundResource.category)}</span>
                                <span>目前數量：{foundResource.quantity} {foundResource.unit}</span>
                                {foundResource.location && (
                                    <span>位置：{foundResource.location}</span>
                                )}
                            </div>
                            <div className="quick-stock-in-barcode">
                                條碼：<code>{scannedBarcode}</code>
                            </div>
                        </div>

                        <div className="quick-stock-in-form">
                            <div className="quick-stock-in-field">
                                <label>入庫數量</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                />
                                <span className="quick-stock-in-unit">{foundResource.unit}</span>
                            </div>
                            <div className="quick-stock-in-field">
                                <label>備註</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="選填，例如：捐贈來源"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="quick-stock-in-error">
                                <WarningIcon size={16} aria-hidden="true" /> {error}
                            </div>
                        )}

                        <div className="quick-stock-in-actions">
                            <Button variant="secondary" onClick={handleContinueScan}>
                                ← 重新掃描
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirmStockIn}
                                disabled={stockInMutation.isPending}
                            >
                                {stockInMutation.isPending ? '處理中...' : <><CheckIcon size={16} aria-hidden="true" /> 確認入庫</>}
                            </Button>
                        </div>
                    </div>
                )}

                {/* 找不到物資 */}
                {scanState === 'not-found' && (
                    <div className="quick-stock-in-not-found">
                        <div className="quick-stock-in-not-found-icon" aria-hidden="true"><InfoIcon size={32} /></div>
                        <h4>找不到此條碼對應的物資</h4>
                        <p>條碼：<code>{scannedBarcode}</code></p>
                        <p>請確認條碼正確，或先在系統中建立此物資。</p>
                        <div className="quick-stock-in-actions">
                            <Button variant="primary" onClick={handleContinueScan}>
                                重新掃描
                            </Button>
                        </div>
                    </div>
                )}

                {/* 入庫成功 */}
                {scanState === 'success' && foundResource && (
                    <div className="quick-stock-in-success">
                        <div className="quick-stock-in-success-icon" aria-hidden="true"><CheckIcon size={32} /></div>
                        <h4>入庫成功！</h4>
                        <p>
                            <strong>{foundResource.name}</strong> 已入庫 <strong>{quantity}</strong> {foundResource.unit}
                        </p>
                        <p className="quick-stock-in-success-after">
                            入庫後數量：{foundResource.quantity + quantity} {foundResource.unit}
                        </p>
                        <div className="quick-stock-in-actions">
                            <Button variant="secondary" onClick={handleClose}>
                                關閉
                            </Button>
                            <Button variant="primary" onClick={handleContinueScan}>
                                繼續掃描
                            </Button>
                        </div>
                    </div>
                )}

                {/* 入庫失敗 */}
                {scanState === 'error' && (
                    <div className="quick-stock-in-error-state">
                        <div className="quick-stock-in-error-icon" aria-hidden="true"><CloseIcon size={32} /></div>
                        <h4>入庫失敗</h4>
                        <p>{error}</p>
                        <div className="quick-stock-in-actions">
                            <Button variant="primary" onClick={handleContinueScan}>
                                重新掃描
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default QuickStockInModal;
