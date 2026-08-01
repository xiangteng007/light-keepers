import React, { useState, useEffect, useCallback } from 'react';
import { Map as MapIcon, MapPin, Palette, Package as PackageIcon, Check, X } from 'lucide-react';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import { Alert, Badge, Button, ProgressBar } from '../design-system';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import './OfflinePrepPage.css';

interface MapPackage {
    id: string;
    name: string;
    type: 'pmtiles' | 'mbtiles' | 'style';
    fileUrl: string;
    size: number;
    sha256: string;
    version: string;
    publishedAt: string;
    region?: string;
    description?: string;
}

interface DownloadProgress {
    packageId: string;
    bytesDownloaded: number;
    totalBytes: number;
    status: 'pending' | 'downloading' | 'verifying' | 'complete' | 'failed';
    error?: string;
}

interface OfflinePrepPageProps {
    sessionId?: string;
    onComplete?: () => void;
}

export const OfflinePrepPage: React.FC<OfflinePrepPageProps> = ({
    sessionId,
    onComplete,
}) => {
    const [packages, setPackages] = useState<MapPackage[]>([]);
    const [recommended, setRecommended] = useState<MapPackage[]>([]);
    const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalSpace, setTotalSpace] = useState(0);
    const [usedSpace, setUsedSpace] = useState(0);

    // Fetch available packages
    const fetchPackages = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch all packages
            const { data: allData } = await api.get('/map-packages');
            setPackages(allData);

            // Fetch recommended for session
            if (sessionId) {
                const { data: recData } = await api.get('/map-packages/recommend', {
                    params: { sessionId },
                });
                setRecommended(recData);
            }

            // Calculate total size
            const total = allData.reduce((sum: number, pkg: MapPackage) => sum + pkg.size, 0);
            setTotalSpace(total);
        } catch (err) {
            setError(getApiErrorMessage(err, '無法載入地圖套件'));
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    // Format bytes to human readable
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    // Start download (stub - would use Capacitor in real app)
    const startDownload = useCallback(async (pkg: MapPackage) => {
        const progress: DownloadProgress = {
            packageId: pkg.id,
            bytesDownloaded: 0,
            totalBytes: pkg.size,
            status: 'downloading',
        };

        setDownloads(prev => new Map(prev).set(pkg.id, progress));

        // Simulate download progress (in real app, use Capacitor HTTP plugin)
        const simulateProgress = () => {
            setDownloads(prev => {
                const current = prev.get(pkg.id);
                if (!current || current.status !== 'downloading') return prev;

                const newBytes = Math.min(
                    current.bytesDownloaded + Math.random() * 500000,
                    current.totalBytes
                );

                const updated = new Map(prev);
                if (newBytes >= current.totalBytes) {
                    updated.set(pkg.id, { ...current, bytesDownloaded: current.totalBytes, status: 'complete' });
                    setUsedSpace(prev => prev + pkg.size);
                } else {
                    updated.set(pkg.id, { ...current, bytesDownloaded: newBytes });
                    setTimeout(simulateProgress, 100);
                }
                return updated;
            });
        };

        setTimeout(simulateProgress, 100);
    }, []);

    // Cancel download
    const cancelDownload = useCallback((packageId: string) => {
        setDownloads(prev => {
            const updated = new Map(prev);
            updated.delete(packageId);
            return updated;
        });
    }, []);

    // Download all recommended
    const downloadAllRecommended = useCallback(async () => {
        for (const pkg of recommended) {
            if (!downloads.has(pkg.id)) {
                await startDownload(pkg);
            }
        }
    }, [recommended, downloads, startDownload]);

    // Check if all recommended are downloaded
    const allRecommendedDownloaded = recommended.every(pkg => {
        const progress = downloads.get(pkg.id);
        return progress?.status === 'complete';
    });

    return (
        <div className="opp-container">
            <div className="page-header">
                <div className="page-header__titles">
                    <h1>離線地圖準備</h1>
                    <p className="page-header__subtitle">下載任務區域的離線地圖</p>
                </div>
            </div>

            {error && (
                <Alert variant="danger" title="載入失敗" className="opp-alert">
                    <div className="opp-alert__body">
                        <span>{error}</span>
                        <Button variant="secondary" size="sm" onClick={fetchPackages}>重試</Button>
                    </div>
                </Alert>
            )}

            {isLoading ? (
                <div className="opp-skeleton" role="status" aria-label="載入地圖套件中">
                    <Skeleton variant="card" height={72} count={3} />
                </div>
            ) : (
                <>
                    {/* Storage info */}
                    <section className="opp-storage" aria-label="儲存空間使用量">
                        <ProgressBar
                            value={usedSpace}
                            max={totalSpace || 1}
                            label="已使用空間"
                            showValue
                            variant="gradient"
                        />
                        <div className="opp-storage-info">
                            <span>已使用 {formatBytes(usedSpace)}</span>
                            <span>總計 {formatBytes(totalSpace)}</span>
                        </div>
                    </section>

                    {/* Recommended section */}
                    {recommended.length > 0 && (
                        <section className="opp-section" aria-label="建議下載">
                            <div className="opp-section-header">
                                <h2>建議下載</h2>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={downloadAllRecommended}
                                    disabled={allRecommendedDownloaded}
                                >
                                    {allRecommendedDownloaded ? '已完成' : '全部下載'}
                                </Button>
                            </div>
                            <div className="opp-list">
                                {recommended.map(pkg => (
                                    <PackageCard
                                        key={pkg.id}
                                        package={pkg}
                                        progress={downloads.get(pkg.id)}
                                        onDownload={() => startDownload(pkg)}
                                        onCancel={() => cancelDownload(pkg.id)}
                                        formatBytes={formatBytes}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* All packages */}
                    <section className="opp-section" aria-label="所有套件">
                        <div className="opp-section-header">
                            <h2>所有套件</h2>
                        </div>
                        {packages.length === 0 ? (
                            <EmptyState
                                icon={MapIcon}
                                variant="minimal"
                                title="尚無可用地圖套件"
                                description="請稍後再試，或聯繫管理員新增地圖套件"
                            />
                        ) : (
                            <div className="opp-list">
                                {packages.map(pkg => (
                                    <PackageCard
                                        key={pkg.id}
                                        package={pkg}
                                        progress={downloads.get(pkg.id)}
                                        onDownload={() => startDownload(pkg)}
                                        onCancel={() => cancelDownload(pkg.id)}
                                        formatBytes={formatBytes}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* Complete button */}
            {onComplete && (
                <div className="opp-footer">
                    <Button
                        variant="primary"
                        onClick={onComplete}
                        disabled={!allRecommendedDownloaded && recommended.length > 0}
                        className="opp-footer__btn"
                    >
                        繼續任務
                    </Button>
                </div>
            )}
        </div>
    );
};

// Individual package card
interface PackageCardProps {
    package: MapPackage;
    progress?: DownloadProgress;
    onDownload: () => void;
    onCancel: () => void;
    formatBytes: (bytes: number) => string;
}

const PackageCard: React.FC<PackageCardProps> = ({
    package: pkg,
    progress,
    onDownload,
    onCancel,
    formatBytes,
}) => {
    const TypeIcon = (type: string) => {
        switch (type) {
            case 'pmtiles': return MapIcon;
            case 'mbtiles': return MapPin;
            case 'style': return Palette;
            default: return PackageIcon;
        }
    };
    const Icon = TypeIcon(pkg.type);

    const progressPercent = progress
        ? Math.round((progress.bytesDownloaded / progress.totalBytes) * 100)
        : 0;

    return (
        <div className={`opp-card ${progress?.status === 'complete' ? 'is-complete' : ''}`}>
            <div className="opp-card-icon" aria-hidden="true"><Icon size={24} /></div>
            <div className="opp-card-content">
                <div className="opp-card-name">{pkg.name}</div>
                <div className="opp-card-meta">
                    <span>{pkg.type.toUpperCase()}</span>
                    <span>{formatBytes(pkg.size)}</span>
                    {pkg.region && <span>{pkg.region}</span>}
                </div>
                {progress && progress.status !== 'complete' && (
                    <div className="opp-card-progress">
                        <ProgressBar value={progressPercent} showValue={false} size="sm" />
                    </div>
                )}
            </div>
            <div className="opp-card-actions">
                {!progress && (
                    <Button variant="secondary" size="sm" onClick={onDownload}>
                        下載
                    </Button>
                )}
                {progress?.status === 'downloading' && (
                    <Button variant="secondary" size="sm" onClick={onCancel} aria-label={`取消下載 ${pkg.name}`}>
                        <X size={14} aria-hidden="true" /> 取消
                    </Button>
                )}
                {progress?.status === 'complete' && (
                    <Badge variant="success" size="sm" icon={<Check size={12} aria-hidden="true" />}>
                        已完成
                    </Badge>
                )}
            </div>
        </div>
    );
};

export default OfflinePrepPage;
