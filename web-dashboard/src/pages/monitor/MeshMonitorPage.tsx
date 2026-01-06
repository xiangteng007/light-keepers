/**
 * 網狀網路監控頁面 (Mesh Monitor Page)
 * 模組 B 前端：LoRa 節點拓樸與訊息監控
 */

import React, { useState, useEffect, useCallback } from 'react';
import './MeshMonitorPage.css';

interface MeshNode {
    id: string;
    nodeId: string;
    name: string;
    lastLocation: { lat: number; lng: number; alt?: number } | null;
    lastSeen: string;
    isActive: boolean;
    messageCount: number;
    batteryLevel: number | null;
}

interface MeshMessage {
    id: string;
    nodeId: string;
    content: string;
    location: { lat: number; lng: number } | null;
    snr: number | null;
    receivedAt: string;
    isSynced: boolean;
    isProcessed: boolean;
}

interface MeshStats {
    totalNodes: number;
    activeNodes: number;
    totalMessages: number;
    unsyncedMessages: number;
    emergencyMessages: number;
}

const MeshMonitorPage: React.FC = () => {
    const [nodes, setNodes] = useState<MeshNode[]>([]);
    const [messages, setMessages] = useState<MeshMessage[]>([]);
    const [stats, setStats] = useState<MeshStats | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000); // 每 10 秒更新
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedNode) {
            loadNodeMessages(selectedNode);
        }
    }, [selectedNode]);

    const loadData = async () => {
        await Promise.all([loadNodes(), loadStats()]);
        setLoading(false);
    };

    const loadNodes = async () => {
        try {
            const response = await fetch('/api/mesh/nodes');
            if (response.ok) {
                const data = await response.json();
                setNodes(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load nodes:', error);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetch('/api/mesh/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const loadNodeMessages = async (nodeId: string) => {
        try {
            const response = await fetch(`/api/mesh/nodes/${encodeURIComponent(nodeId)}/messages?limit=20`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const triggerSync = async () => {
        setSyncing(true);
        try {
            const response = await fetch('/api/mesh/sync', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                alert(`已同步 ${data.data.synced} 筆訊息`);
                loadStats();
            }
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const getNodeStatus = useCallback((node: MeshNode) => {
        const lastSeen = new Date(node.lastSeen);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

        if (diffMinutes < 5) return 'online';
        if (diffMinutes < 30) return 'idle';
        return 'offline';
    }, []);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffMinutes < 1) return '剛剛';
        if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} 小時前`;
        return date.toLocaleDateString('zh-TW');
    };

    const getSignalStrength = (snr: number | null) => {
        if (snr === null) return '未知';
        if (snr > 10) return '極佳';
        if (snr > 5) return '良好';
        if (snr > 0) return '普通';
        return '微弱';
    };

    if (loading) {
        return <div className="mesh-loading">載入網狀網路資料...</div>;
    }

    return (
        <div className="mesh-monitor-page">
            <header className="mesh-header">
                <h1>📡 網狀網路監控</h1>
                <div className="header-actions">
                    <button
                        className="sync-btn"
                        onClick={triggerSync}
                        disabled={syncing}
                    >
                        {syncing ? '同步中...' : '🔄 同步離線資料'}
                    </button>
                </div>
            </header>

            {/* 統計數據 */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-icon">📡</span>
                        <div className="stat-content">
                            <span className="stat-value">{stats.totalNodes}</span>
                            <span className="stat-label">總節點數</span>
                        </div>
                    </div>
                    <div className="stat-card online">
                        <span className="stat-icon">🟢</span>
                        <div className="stat-content">
                            <span className="stat-value">{stats.activeNodes}</span>
                            <span className="stat-label">活躍節點</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">💬</span>
                        <div className="stat-content">
                            <span className="stat-value">{stats.totalMessages}</span>
                            <span className="stat-label">總訊息數</span>
                        </div>
                    </div>
                    <div className={`stat-card ${stats.unsyncedMessages > 0 ? 'warning' : ''}`}>
                        <span className="stat-icon">⏳</span>
                        <div className="stat-content">
                            <span className="stat-value">{stats.unsyncedMessages}</span>
                            <span className="stat-label">待同步</span>
                        </div>
                    </div>
                    <div className={`stat-card ${stats.emergencyMessages > 0 ? 'alert' : ''}`}>
                        <span className="stat-icon">🚨</span>
                        <div className="stat-content">
                            <span className="stat-value">{stats.emergencyMessages}</span>
                            <span className="stat-label">緊急訊息</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="mesh-content">
                {/* 節點列表 */}
                <section className="nodes-section">
                    <h2>🔌 節點列表</h2>
                    <div className="nodes-list">
                        {nodes.length === 0 ? (
                            <div className="no-nodes">
                                <span>📭</span>
                                <p>尚無已連接的節點</p>
                            </div>
                        ) : (
                            nodes.map(node => (
                                <div
                                    key={node.id}
                                    className={`node-card ${selectedNode === node.nodeId ? 'selected' : ''} ${getNodeStatus(node)}`}
                                    onClick={() => setSelectedNode(node.nodeId)}
                                >
                                    <div className="node-header">
                                        <span className={`status-dot ${getNodeStatus(node)}`} />
                                        <span className="node-name">{node.name || node.nodeId}</span>
                                    </div>
                                    <div className="node-meta">
                                        <span>📍 {node.lastLocation ? `${node.lastLocation.lat.toFixed(4)}, ${node.lastLocation.lng.toFixed(4)}` : '未知'}</span>
                                        <span>💬 {node.messageCount} 則</span>
                                    </div>
                                    <div className="node-footer">
                                        {node.batteryLevel !== null && (
                                            <span className="battery">
                                                🔋 {node.batteryLevel}%
                                            </span>
                                        )}
                                        <span className="last-seen">
                                            {formatTime(node.lastSeen)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* 訊息列表 */}
                <section className="messages-section">
                    <h2>📨 {selectedNode ? `來自 ${selectedNode} 的訊息` : '選擇節點查看訊息'}</h2>
                    {selectedNode && (
                        <div className="messages-list">
                            {messages.length === 0 ? (
                                <div className="no-messages">
                                    <p>此節點無訊息記錄</p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`message-card ${msg.isProcessed ? 'processed' : ''}`}
                                    >
                                        <div className="message-content">
                                            {msg.content}
                                        </div>
                                        <div className="message-meta">
                                            <span>📶 {getSignalStrength(msg.snr)}</span>
                                            {msg.location && (
                                                <span>📍 {msg.location.lat.toFixed(4)}, {msg.location.lng.toFixed(4)}</span>
                                            )}
                                            <span>{msg.isSynced ? '✅ 已同步' : '⏳ 待同步'}</span>
                                            <span>{formatTime(msg.receivedAt)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* 網路拓樸簡圖 */}
            <section className="topology-section">
                <h2>🌐 網路拓樸</h2>
                <div className="topology-map">
                    <div className="topology-center">
                        <div className="gateway-node">
                            <span>🖥️</span>
                            <p>Gateway</p>
                        </div>
                    </div>
                    <div className="topology-ring">
                        {nodes.slice(0, 8).map((node, index) => (
                            <div
                                key={node.id}
                                className={`topology-node ${getNodeStatus(node)}`}
                                style={{
                                    transform: `rotate(${index * 45}deg) translateY(-80px) rotate(-${index * 45}deg)`
                                }}
                            >
                                <span className={`status-indicator ${getNodeStatus(node)}`}>📡</span>
                                <p>{node.name || node.nodeId.substring(0, 6)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MeshMonitorPage;
