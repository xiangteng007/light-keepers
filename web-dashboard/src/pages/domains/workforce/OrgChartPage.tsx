import React, { useState } from 'react';
import './OrgChartPage.css';

interface OrgNode {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    managerId?: string;
    memberCount?: number;
}

const initialData: OrgNode[] = [
    { id: 'root', name: '光守護者協�?, type: 'organization', parentId: null, memberCount: 500 },
    { id: 'north', name: '北區分會', type: 'division', parentId: 'root', memberCount: 150 },
    { id: 'central', name: '中區分會', type: 'division', parentId: 'root', memberCount: 120 },
    { id: 'south', name: '南區分會', type: 'division', parentId: 'root', memberCount: 130 },
    { id: 'east', name: '東區分會', type: 'division', parentId: 'root', memberCount: 100 },
    { id: 'taipei', name: '台北支部', type: 'branch', parentId: 'north', memberCount: 80 },
    { id: 'newtaipei', name: '新北支部', type: 'branch', parentId: 'north', memberCount: 70 },
    { id: 'taichung', name: '台中支部', type: 'branch', parentId: 'central', memberCount: 60 },
    { id: 'kaohsiung', name: '高雄支部', type: 'branch', parentId: 'south', memberCount: 50 },
];

export const OrgChartPage: React.FC = () => {
    const [nodes] = useState<OrgNode[]>(initialData);
    const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
    const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

    const getChildren = (parentId: string) => nodes.filter(n => n.parentId === parentId);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'organization': return '🏛�?;
            case 'division': return '🏢';
            case 'branch': return '🏠';
            case 'team': return '👥';
            default: return '📁';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'organization': return '#FFD700';
            case 'division': return '#4CAF50';
            case 'branch': return '#2196F3';
            case 'team': return '#9C27B0';
            default: return '#888';
        }
    };

    const renderTreeNode = (node: OrgNode, level: number = 0) => {
        const children = getChildren(node.id);

        return (
            <div key={node.id} className="tree-node-wrapper">
                <div
                    className={`tree-node ${selectedNode?.id === node.id ? 'selected' : ''}`}
                    style={{ borderColor: getTypeColor(node.type) }}
                    onClick={() => setSelectedNode(node)}
                >
                    <span className="node-icon">{getTypeIcon(node.type)}</span>
                    <div className="node-info">
                        <div className="node-name">{node.name}</div>
                        <div className="node-meta">
                            <span className="node-type">{node.type}</span>
                            <span className="node-count">{node.memberCount}�?/span>
                        </div>
                    </div>
                </div>
                {children.length > 0 && (
                    <div className="tree-children">
                        {children.map(child => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const rootNode = nodes.find(n => n.parentId === null);

    return (
        <div className="org-chart-page">
            <div className="page-header">
                <h1>🏢 組織架構</h1>
                <p>管理組織層級與人員配�?/p>
            </div>

            <div className="view-controls">
                <button className={viewMode === 'tree' ? 'active' : ''} onClick={() => setViewMode('tree')}>
                    🌳 樹狀�?
                </button>
                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                    📋 列表
                </button>
            </div>

            <div className="org-content">
                <div className="tree-container">
                    {viewMode === 'tree' && rootNode && renderTreeNode(rootNode)}

                    {viewMode === 'list' && (
                        <div className="list-view">
                            {nodes.map(node => (
                                <div
                                    key={node.id}
                                    className={`list-item ${selectedNode?.id === node.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedNode(node)}
                                >
                                    <span className="item-icon">{getTypeIcon(node.type)}</span>
                                    <span className="item-name">{node.name}</span>
                                    <span className="item-type" style={{ color: getTypeColor(node.type) }}>{node.type}</span>
                                    <span className="item-count">{node.memberCount}�?/span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedNode && (
                    <div className="detail-panel">
                        <h3>{getTypeIcon(selectedNode.type)} {selectedNode.name}</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>類型</label>
                                <span style={{ color: getTypeColor(selectedNode.type) }}>{selectedNode.type}</span>
                            </div>
                            <div className="detail-item">
                                <label>成員�?/label>
                                <span>{selectedNode.memberCount}�?/span>
                            </div>
                            <div className="detail-item">
                                <label>ID</label>
                                <span>{selectedNode.id}</span>
                            </div>
                            <div className="detail-item">
                                <label>上級單位</label>
                                <span>{nodes.find(n => n.id === selectedNode.parentId)?.name || '-'}</span>
                            </div>
                        </div>
                        <div className="detail-actions">
                            <button className="action-btn edit">✏️ 編輯</button>
                            <button className="action-btn members">👥 成員</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="org-stats">
                <div className="stat">
                    <span className="stat-value">{nodes.length}</span>
                    <span className="stat-label">組織單位</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{nodes.reduce((sum, n) => sum + (n.memberCount || 0), 0)}</span>
                    <span className="stat-label">總成員數</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{nodes.filter(n => n.type === 'division').length}</span>
                    <span className="stat-label">分會�?/span>
                </div>
                <div className="stat">
                    <span className="stat-value">{nodes.filter(n => n.type === 'branch').length}</span>
                    <span className="stat-label">支部�?/span>
                </div>
            </div>
        </div>
    );
};

export default OrgChartPage;
