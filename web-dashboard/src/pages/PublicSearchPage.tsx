/**
 * Public Search Page - 民眾協尋查詢 (無需登入)
 */

import React, { useState } from 'react';
import './PublicSearchPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface SearchResult {
    id: string;
    name: string;
    status: string;
    lastKnownLocation?: string;
    description?: string;
    foundLocation?: string;
    foundAt?: string;
}

export const PublicSearchPage: React.FC = () => {
    const [queryCode, setQueryCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        if (!queryCode.trim()) {
            setError('請輸入查詢碼');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(`${API_BASE}/api/reunification/search/${queryCode.trim()}`);
            if (!response.ok) {
                if (response.status === 404) {
                    setError('查無此查詢碼，請確認後再試');
                } else {
                    setError('查詢失敗，請稍後再試');
                }
                return;
            }
            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError('網路連線失敗');
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, { text: string; color: string }> = {
            MISSING: { text: '搜尋中', color: '#ef4444' },
            FOUND_SAFE: { text: '已尋獲 - 平安', color: '#22c55e' },
            FOUND_INJURED: { text: '已尋獲 - 受傷', color: '#f59e0b' },
            FOUND_DECEASED: { text: '罹難', color: '#1a1a1a' },
            REUNITED: { text: '已與家屬團聚', color: '#3b82f6' },
        };
        return labels[status] || { text: status, color: '#888' };
    };

    return (
        <div className="public-search-page">
            <div className="search-container">
                <div className="logo-section">
                    <h1>🔍 災民協尋查詢</h1>
                    <p>請輸入報案時取得的查詢碼</p>
                </div>

                <div className="search-form">
                    <input
                        type="text"
                        value={queryCode}
                        onChange={e => setQueryCode(e.target.value.toUpperCase())}
                        placeholder="輸入查詢碼 (例: ABC123)"
                        maxLength={20}
                        onKeyPress={e => e.key === 'Enter' && handleSearch()}
                        aria-label="查詢碼"
                    />
                    <button onClick={handleSearch} disabled={loading}>
                        {loading ? '查詢中...' : '查詢'}
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                {result && (
                    <div className="result-card">
                        <div className="result-header">
                            <h2>{result.name}</h2>
                            <span
                                className="status-badge"
                                style={{ backgroundColor: getStatusLabel(result.status).color }}
                            >
                                {getStatusLabel(result.status).text}
                            </span>
                        </div>

                        {result.description && (
                            <p className="description">{result.description}</p>
                        )}

                        <div className="info-grid">
                            {result.lastKnownLocation && (
                                <div className="info-item">
                                    <span className="label">最後出現地點</span>
                                    <span className="value">{result.lastKnownLocation}</span>
                                </div>
                            )}

                            {result.foundLocation && (
                                <div className="info-item found">
                                    <span className="label">尋獲地點</span>
                                    <span className="value">{result.foundLocation}</span>
                                </div>
                            )}

                            {result.foundAt && (
                                <div className="info-item found">
                                    <span className="label">尋獲時間</span>
                                    <span className="value">
                                        {new Date(result.foundAt).toLocaleString('zh-TW')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {result.status === 'MISSING' && (
                            <div className="search-status">
                                <p>🔄 搜救人員正在積極搜尋中</p>
                                <p className="hint">如有任何線索，請撥打災害應變中心專線</p>
                            </div>
                        )}

                        {(result.status === 'FOUND_SAFE' || result.status === 'FOUND_INJURED') && (
                            <div className="found-notice">
                                <p>✅ 您的家人已被尋獲</p>
                                <p>請聯繫災害應變中心進行接領</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="footer">
                    <p>© 光守護者災防平台</p>
                    <p>此為公開查詢頁面，僅顯示有限資訊以保護個人隱私</p>
                </div>
            </div>
        </div>
    );
};

export default PublicSearchPage;
