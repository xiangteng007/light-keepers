/**
 * 公開責信查詢頁面 (Transparency Page)
 * 模組 D 前端：物資流向公開查詢
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import { LEGACY } from '../../api/paths';
import './TransparencyPage.css';

interface TimelineStep {
    time: string;
    action: string;
    location?: string;
    actor?: string;
    quantity?: number;
    unit?: string;
    verified: boolean;
}

interface SearchResult {
    receiptNumber: string;
    resourceName: string;
    totalSteps: number;
    timeline: TimelineStep[];
    finalDestination: string;
    chainVerified: boolean;
    lastUpdate: string;
}

interface RecentActivity {
    id: string;
    time: string;
    resourceName: string;
    action: string;
    actor: string;
    location: string;
    verified: boolean;
}

interface Stats {
    totalBlocks: number;
    totalResources: number;
    recentActivity: number;
    chainIntegrity: number;
}

const TransparencyPage: React.FC = () => {
    const [receiptNumber, setReceiptNumber] = useState('');
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
        loadRecentActivity();
    }, []);

    const loadStats = async () => {
        try {
            const { data } = await api.get(`${LEGACY.publicTransparency}/stats`);
            setStats(data.data);
        } catch (error) {
            console.error('Failed to load stats:', getApiErrorMessage(error, '統計資料載入失敗'));
        }
    };

    const loadRecentActivity = async () => {
        try {
            const { data } = await api.get(`${LEGACY.publicTransparency}/recent`, { params: { limit: 10 } });
            setRecentActivity(data.data || []);
        } catch (error) {
            console.error('Failed to load activity:', getApiErrorMessage(error, '最近異動載入失敗'));
        }
    };

    const handleSearch = async () => {
        if (!receiptNumber.trim()) {
            setError('請輸入收據編號');
            return;
        }

        setSearching(true);
        setError('');
        setSearchResult(null);

        try {
            const { data } = await api.get(`${LEGACY.publicTransparency}/search`, {
                params: { receipt: receiptNumber },
            });

            if (data.success) {
                setSearchResult(data.data);
            } else {
                setError(data.message || '查無此收據');
            }
        } catch (error) {
            setError(getApiErrorMessage(error, '查詢失敗，請稍後再試'));
        } finally {
            setSearching(false);
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('zh-TW');
    };

    return (
        <div className="transparency-page">
            <header className="transparency-header">
                <h1>🔍 物資流向查詢</h1>
                <p>捐款/物資透明責信系統</p>
            </header>

            {/* 統計數據 */}
            {stats && (
                <div className="stats-bar">
                    <div className="stat-item">
                        <span className="stat-value">{stats.totalBlocks.toLocaleString()}</span>
                        <span className="stat-label">總記錄數</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{stats.totalResources.toLocaleString()}</span>
                        <span className="stat-label">追蹤物資</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{stats.recentActivity}</span>
                        <span className="stat-label">24h 異動</span>
                    </div>
                    <div className="stat-item highlight">
                        <span className="stat-value">{stats.chainIntegrity}%</span>
                        <span className="stat-label">鏈完整性</span>
                    </div>
                </div>
            )}

            {/* 搜尋區 */}
            <div className="search-section">
                <h2>🧾 收據查詢</h2>
                <p>輸入您的收據編號，查看捐贈物資的最終流向</p>
                <div className="search-box">
                    <input
                        type="text"
                        value={receiptNumber}
                        onChange={e => setReceiptNumber(e.target.value)}
                        placeholder="例：DON-2026-001234"
                        onKeyPress={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={searching}>
                        {searching ? '查詢中...' : '查詢'}
                    </button>
                </div>
                {error && <div className="search-error">❌ {error}</div>}
            </div>

            {/* 查詢結果 */}
            {searchResult && (
                <div className="search-result">
                    <div className="result-header">
                        <div className="result-title">
                            <h3>{searchResult.resourceName}</h3>
                            <span className="receipt-badge">{searchResult.receiptNumber}</span>
                        </div>
                        <div className={`verification-badge ${searchResult.chainVerified ? 'verified' : 'warning'}`}>
                            {searchResult.chainVerified ? '✅ 區塊鏈驗證通過' : '⚠️ 驗證中'}
                        </div>
                    </div>

                    <div className="result-summary">
                        <div className="summary-item">
                            <span>📍 最終位置</span>
                            <strong>{searchResult.finalDestination || '運送中'}</strong>
                        </div>
                        <div className="summary-item">
                            <span>📊 處理步驟</span>
                            <strong>{searchResult.totalSteps} 步</strong>
                        </div>
                        <div className="summary-item">
                            <span>🕐 最後更新</span>
                            <strong>{formatTime(searchResult.lastUpdate)}</strong>
                        </div>
                    </div>

                    <div className="result-timeline">
                        <h4>📜 完整履歷</h4>
                        <div className="timeline">
                            {searchResult.timeline.map((step, index) => (
                                <div key={index} className={`timeline-step ${step.verified ? 'verified' : ''}`}>
                                    <div className="step-marker">
                                        {step.verified ? '✓' : (index + 1)}
                                    </div>
                                    <div className="step-content">
                                        <div className="step-header">
                                            <span className="step-action">{step.action}</span>
                                            <span className="step-time">{formatTime(step.time)}</span>
                                        </div>
                                        <div className="step-details">
                                            {step.location && <span>📍 {step.location}</span>}
                                            {step.actor && <span>👤 {step.actor}</span>}
                                            {step.quantity && <span>📦 {step.quantity} {step.unit}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 最近異動 */}
            <div className="recent-section">
                <h2>📋 最近異動</h2>
                <div className="recent-list">
                    {recentActivity.map(activity => (
                        <div key={activity.id} className="recent-item">
                            <div className="recent-icon">
                                {activity.verified ? '✅' : '🔄'}
                            </div>
                            <div className="recent-content">
                                <div className="recent-header">
                                    <span className="resource-name">{activity.resourceName}</span>
                                    <span className="action-badge">{activity.action}</span>
                                </div>
                                <div className="recent-meta">
                                    {activity.location && <span>📍 {activity.location}</span>}
                                    {activity.actor && <span>👤 {activity.actor}</span>}
                                </div>
                            </div>
                            <div className="recent-time">
                                {formatTime(activity.time)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 說明區 */}
            <div className="info-section">
                <h2>ℹ️ 關於責信系統</h2>
                <div className="info-cards">
                    <div className="info-card">
                        <span className="info-icon">🔗</span>
                        <h3>區塊鏈技術</h3>
                        <p>每筆物資異動都以 SHA-256 雜湊值串連，確保記錄無法被竄改。</p>
                    </div>
                    <div className="info-card">
                        <span className="info-icon">👁️</span>
                        <h3>完全透明</h3>
                        <p>所有捐贈者都可以追蹤自己的善款/物資最終去向。</p>
                    </div>
                    <div className="info-card">
                        <span className="info-icon">🔒</span>
                        <h3>隱私保護</h3>
                        <p>受贈者個資已匿名化處理，兼顧透明與隱私。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransparencyPage;
