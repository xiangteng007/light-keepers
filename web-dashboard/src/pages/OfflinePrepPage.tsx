/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
import React, { useState, useEffect, useCallback } from 'react';
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
    useEffect(() => {
        const fetchPackages = async () => {
            setIsLoading(true);
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const token = localStorage.getItem('accessToken');

                // Fetch all packages
                const allRes = await fetch(`${API_URL}/map-packages`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const allData = await allRes.json();
                setPackages(allData);

                // Fetch recommended for session
                if (sessionId) {
                    const recRes = await fetch(`${API_URL}/map-packages/recommend?sessionId=${sessionId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const recData = await recRes.json();
                    setRecommended(recData);
                }

                // Calculate total size
                const total = allData.reduce((sum: number, pkg: MapPackage) => sum + pkg.size, 0);
                setTotalSpace(total);
            } catch (err: any) {
                setError(err.message || '無法載入地圖套件');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPackages();
    }, [sessionId]);

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

    if (isLoading) {
        return (
            <div className="opp-container">
                <div className="opp-loading">載入地圖套件中...</div>
            </div>
        );
    }

    return (
        <div className="opp-container">
            <header className="opp-header">
                <h1 className="opp-title">📦 離線地圖準備</h1>
                <p className="opp-subtitle">下載任務區域的離線地圖</p>
            </header>

            {error && (
                <div className="opp-error">
                    {error}
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {/* Storage info */}
            <div className="opp-storage">
                <div className="opp-storage-bar">
                    <div
                        className="opp-storage-used"
                        style={{ width: `${(usedSpace / totalSpace) * 100}%` }}
                    />
                </div>
                <div className="opp-storage-info">
                    <span>已使用: {formatBytes(usedSpace)}</span>
                    <span>總計: {formatBytes(totalSpace)}</span>
                </div>
            </div>

            {/* Recommended section */}
            {recommended.length > 0 && (
                <section className="opp-section">
                    <div className="opp-section-header">
                        <h2>建議下載</h2>
                        <button
                            className="opp-btn opp-btn--primary"
                            onClick={downloadAllRecommended}
                            disabled={allRecommendedDownloaded}
                        >
                            {allRecommendedDownloaded ? '✓ 已完成' : '全部下載'}
                        </button>
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
            <section className="opp-section">
                <div className="opp-section-header">
                    <h2>所有套件</h2>
                </div>
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
            </section>

            {/* Complete button */}
            {onComplete && (
                <div className="opp-footer">
                    <button
                        className="opp-btn opp-btn--success"
                        onClick={onComplete}
                        disabled={!allRecommendedDownloaded && recommended.length > 0}
                    >
                        繼續任務
                    </button>
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
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'pmtiles': return '🗺️';
            case 'mbtiles': return '📍';
            case 'style': return '🎨';
            default: return '📦';
        }
    };

    const progressPercent = progress
        ? (progress.bytesDownloaded / progress.totalBytes) * 100
        : 0;

    return (
        <div className={`opp-card ${progress?.status === 'complete' ? 'complete' : ''}`}>
            <div className="opp-card-icon">{getTypeIcon(pkg.type)}</div>
            <div className="opp-card-content">
                <div className="opp-card-name">{pkg.name}</div>
                <div className="opp-card-meta">
                    <span>{pkg.type.toUpperCase()}</span>
                    <span>{formatBytes(pkg.size)}</span>
                    {pkg.region && <span>{pkg.region}</span>}
                </div>
                {progress && progress.status !== 'complete' && (
                    <div className="opp-card-progress">
                        <div
                            className="opp-card-progress-bar"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}
            </div>
            <div className="opp-card-actions">
                {!progress && (
                    <button className="opp-btn opp-btn--small" onClick={onDownload}>
                        下載
                    </button>
                )}
                {progress?.status === 'downloading' && (
                    <button className="opp-btn opp-btn--small opp-btn--danger" onClick={onCancel}>
                        取消
                    </button>
                )}
                {progress?.status === 'complete' && (
                    <span className="opp-card-complete">✓</span>
                )}
            </div>
        </div>
    );
};

export default OfflinePrepPage;
