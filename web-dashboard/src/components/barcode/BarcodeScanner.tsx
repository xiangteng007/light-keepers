import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button, Card } from '../../design-system';
import './BarcodeScanner.css';

export interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (error: string) => void;
    onClose?: () => void;
    width?: number;
    height?: number;
    fps?: number;
    qrbox?: { width: number; height: number };
    aspectRatio?: number;
    disableFlip?: boolean;
    title?: string;
}

export function BarcodeScanner({
    onScan,
    onError,
    onClose,
    width = 300,
    height = 300,
    fps = 10,
    qrbox = { width: 250, height: 150 },
    aspectRatio = 1.5,
    disableFlip = false,
    title = '條碼掃描',
}: BarcodeScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [lastScanned, setLastScanned] = useState<string>('');

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scannerIdRef = useRef(`html5-qrcode-scanner-${Date.now()}`);

    // 獲取可用相機列表
    const getCameras = useCallback(async () => {
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                setCameras(devices);
                // 優先選擇後鏡頭
                const backCamera = devices.find(
                    d => d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('rear') ||
                        d.label.toLowerCase().includes('後')
                );
                setSelectedCamera(backCamera?.id || devices[0].id);
            } else {
                setError('未找到相機設備');
            }
        } catch (err) {
            setError('無法存取相機，請確認已授權相機權限');
            console.error('Camera access error:', err);
        }
    }, []);

    // 初始化時獲取相機
    useEffect(() => {
        getCameras();
        return () => {
            // 清理
            if (scannerRef.current) {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING) {
                    scannerRef.current.stop().catch(console.error);
                }
            }
        };
    }, [getCameras]);

    // 開始掃描
    const startScanning = useCallback(async () => {
        if (!selectedCamera) {
            setError('請選擇相機');
            return;
        }

        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(scannerIdRef.current);
        }

        try {
            setError('');
            await scannerRef.current.start(
                selectedCamera,
                {
                    fps,
                    qrbox,
                    aspectRatio,
                    disableFlip,
                },
                (decodedText) => {
                    // 避免重複掃描同樣條碼
                    if (decodedText !== lastScanned) {
                        setLastScanned(decodedText);
                        onScan(decodedText);
                    }
                },
                () => {
                    // 掃描中的錯誤（例如無法辨識）- 忽略
                }
            );
            setIsScanning(true);
        } catch (err: any) {
            setError(err.message || '無法啟動掃描器');
            onError?.(err.message);
        }
    }, [selectedCamera, fps, qrbox, aspectRatio, disableFlip, lastScanned, onScan, onError]);

    // 停止掃描
    const stopScanning = useCallback(async () => {
        if (scannerRef.current) {
            const state = scannerRef.current.getState();
            if (state === Html5QrcodeScannerState.SCANNING) {
                await scannerRef.current.stop();
            }
            setIsScanning(false);
        }
    }, []);

    // 切換相機
    const switchCamera = useCallback(async (cameraId: string) => {
        if (isScanning) {
            await stopScanning();
        }
        setSelectedCamera(cameraId);
        setLastScanned(''); // 重設以允許重新掃描
    }, [isScanning, stopScanning]);

    // 重設最後掃描（允許重新掃描同樣條碼）
    const resetLastScanned = useCallback(() => {
        setLastScanned('');
    }, []);

    return (
        <Card className="barcode-scanner-card">
            <div className="barcode-scanner-header">
                <h3>{title}</h3>
                {onClose && (
                    <button className="barcode-scanner-close" onClick={onClose}>
                        ✕
                    </button>
                )}
            </div>

            <div className="barcode-scanner-content">
                {/* 相機選擇 */}
                {cameras.length > 1 && (
                    <div className="barcode-scanner-camera-select">
                        <label>選擇相機：</label>
                        <select
                            value={selectedCamera}
                            onChange={(e) => switchCamera(e.target.value)}
                            disabled={isScanning}
                        >
                            {cameras.map((cam) => (
                                <option key={cam.id} value={cam.id}>
                                    {cam.label || `相機 ${cam.id.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 掃描區域 */}
                <div
                    className="barcode-scanner-viewport"
                    ref={containerRef}
                    style={{ width, minHeight: height }}
                >
                    <div id={scannerIdRef.current} />
                </div>

                {/* 錯誤訊息 */}
                {error && (
                    <div className="barcode-scanner-error">
                        ⚠️ {error}
                    </div>
                )}

                {/* 最後掃描結果 */}
                {lastScanned && (
                    <div className="barcode-scanner-result">
                        <span className="barcode-scanner-result-label">已掃描：</span>
                        <code className="barcode-scanner-result-value">{lastScanned}</code>
                        <button
                            className="barcode-scanner-result-reset"
                            onClick={resetLastScanned}
                            title="重新掃描"
                        >
                            🔄
                        </button>
                    </div>
                )}

                {/* 控制按鈕 */}
                <div className="barcode-scanner-controls">
                    {!isScanning ? (
                        <Button
                            variant="primary"
                            onClick={startScanning}
                            disabled={!selectedCamera}
                        >
                            📷 開始掃描
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={stopScanning}>
                            ⏹️ 停止掃描
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}

export default BarcodeScanner;
