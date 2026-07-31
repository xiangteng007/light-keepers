import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import './PackageLibraryPage.css';

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
    isDownloaded?: boolean;
    localPath?: string;
}

type FilterType = 'all' | 'pmtiles' | 'mbtiles' | 'style' | 'downloaded';

export const PackageLibraryPage: React.FC = () => {
    const [packages, setPackages] = useState<MapPackage[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch packages
    useEffect(() => {
        const fetchPackages = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/map-packages');

                // Check local storage for downloaded status (stub)
                const packagesWithStatus = data.map((pkg: MapPackage) => ({
                    ...pkg,
                    isDownloaded: false, // Would check Capacitor filesystem
                }));

                setPackages(packagesWithStatus);
            } catch (err) {
                setError(getApiErrorMessage(err, '無法載入套件庫'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchPackages();
    }, []);

    // Filter packages
    const filteredPackages = packages.filter(pkg => {
        // Apply type filter
        if (filter === 'downloaded' && !pkg.isDownloaded) return false;
        if (filter !== 'all' && filter !== 'downloaded' && pkg.type !== filter) return false;

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                pkg.name.toLowerCase().includes(query) ||
                pkg.region?.toLowerCase().includes(query) ||
                pkg.description?.toLowerCase().includes(query)
            );
        }

        return true;
    });

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'pmtiles': return '#3b82f6';
            case 'mbtiles': return '#22c55e';
            case 'style': return '#f59e0b';
            default: return '#64748b';
        }
    };

    if (isLoading) {
        return (
            <div className="plp-container">
                <div className="plp-loading">載入套件庫中...</div>
            </div>
        );
    }

    return (
        <div className="plp-container">
            <header className="plp-header">
                <h1 className="plp-title">📚 地圖套件庫</h1>
                <p className="plp-subtitle">管理離線地圖套件</p>
            </header>

            {error && (
                <div className="plp-error">
                    {error}
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {/* Search and filters */}
            <div className="plp-toolbar">
                <div className="plp-search">
                    <input
                        type="text"
                        placeholder="搜尋套件..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="plp-search-icon">🔍</span>
                </div>

                <div className="plp-filters">
                    {(['all', 'pmtiles', 'mbtiles', 'style', 'downloaded'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            className={`plp-filter ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' && '全部'}
                            {f === 'pmtiles' && 'PMTiles'}
                            {f === 'mbtiles' && 'MBTiles'}
                            {f === 'style' && '樣式'}
                            {f === 'downloaded' && '已下載'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Package stats */}
            <div className="plp-stats">
                <div className="plp-stat">
                    <span className="plp-stat-value">{packages.length}</span>
                    <span className="plp-stat-label">總套件數</span>
                </div>
                <div className="plp-stat">
                    <span className="plp-stat-value">
                        {packages.filter(p => p.isDownloaded).length}
                    </span>
                    <span className="plp-stat-label">已下載</span>
                </div>
                <div className="plp-stat">
                    <span className="plp-stat-value">
                        {formatBytes(packages.reduce((sum, p) => sum + p.size, 0))}
                    </span>
                    <span className="plp-stat-label">總大小</span>
                </div>
            </div>

            {/* Package grid */}
            <div className="plp-grid">
                {filteredPackages.map(pkg => (
                    <div key={pkg.id} className="plp-card">
                        <div className="plp-card-header">
                            <span
                                className="plp-card-type"
                                style={{ background: getTypeColor(pkg.type) }}
                            >
                                {pkg.type.toUpperCase()}
                            </span>
                            {pkg.isDownloaded && (
                                <span className="plp-card-downloaded">✓ 已下載</span>
                            )}
                        </div>
                        <h3 className="plp-card-title">{pkg.name}</h3>
                        {pkg.description && (
                            <p className="plp-card-desc">{pkg.description}</p>
                        )}
                        <div className="plp-card-meta">
                            <span>v{pkg.version}</span>
                            <span>{formatBytes(pkg.size)}</span>
                            <span>{formatDate(pkg.publishedAt)}</span>
                        </div>
                        {pkg.region && (
                            <div className="plp-card-region">
                                📍 {pkg.region}
                            </div>
                        )}
                        <div className="plp-card-actions">
                            {pkg.isDownloaded ? (
                                <button className="plp-btn plp-btn--danger">
                                    刪除
                                </button>
                            ) : (
                                <button className="plp-btn plp-btn--primary">
                                    下載
                                </button>
                            )}
                            <button className="plp-btn plp-btn--secondary">
                                詳情
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredPackages.length === 0 && (
                <div className="plp-empty">
                    沒有符合條件的套件
                </div>
            )}
        </div>
    );
};

export default PackageLibraryPage;
