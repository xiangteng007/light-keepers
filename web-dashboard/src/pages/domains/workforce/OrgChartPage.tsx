import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';

interface OrgNode {
    id: string;
    name: string;
    title: string;
    type?: string;
    department: string;
    children?: OrgNode[];
}

export default function OrgChartPage() {
    const [orgData, setOrgData] = useState<OrgNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const fetchOrgChart = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // Get full tree from root — try stats first to find root, then get tree
            const statsRes = await api.get('/org-chart/stats');
            const stats = statsRes.data?.data || statsRes.data || {};
            const rootId = stats.rootId || 'root';

            const treeRes = await api.get(`/org-chart/tree/${rootId}`);
            const treeData = treeRes.data?.data || treeRes.data;

            if (treeData) {
                // Normalize backend org node format to our interface
                const normalizeNode = (node: any): OrgNode => ({
                    id: node.id || node._id,
                    name: node.name || node.managerName || '未命名',
                    title: node.title || node.type || '',
                    department: node.department || node.metadata?.department || node.type || '',
                    children: node.children?.map((c: any) => normalizeNode(c)),
                });
                const tree = normalizeNode(treeData);
                setOrgData(tree);
                // Auto-expand first two levels
                const idsToExpand = new Set<string>();
                idsToExpand.add(tree.id);
                tree.children?.forEach(c => idsToExpand.add(c.id));
                setExpandedNodes(idsToExpand);
            }
        } catch (err: any) {
            console.error('Failed to fetch org chart:', err);
            setError(err?.response?.data?.message || '無法載入組織架構');
            setOrgData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrgChart();
    }, [fetchOrgChart]);

    const toggleNode = (id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const renderNode = (node: OrgNode, level: number = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        return (
            <div key={node.id} className="flex flex-col items-center">
                <div className={`bg-slate-800/80 rounded-lg p-4 border border-slate-700 min-w-48 text-center cursor-pointer hover:border-amber-500 transition-colors ${level === 0 ? 'border-amber-500 bg-amber-500/10' : ''}`} onClick={() => hasChildren && toggleNode(node.id)}>
                    <div className="w-12 h-12 rounded-full bg-amber-500 mx-auto mb-2 flex items-center justify-center text-black font-bold">{node.name.charAt(0)}</div>
                    <h4 className="text-white font-medium">{node.name}</h4>
                    <p className="text-amber-400 text-sm">{node.title}</p>
                    <p className="text-gray-400 text-xs">{node.department}</p>
                    {hasChildren && <span className="text-gray-400 text-xs mt-1 block">{isExpanded ? '▼' : '▶'} {node.children?.length} 成員</span>}
                </div>
                {hasChildren && isExpanded && (
                    <div className="mt-4">
                        <div className="w-px h-4 bg-slate-600 mx-auto"></div>
                        <div className="flex gap-8">
                            {node.children?.map((child) => <div key={child.id}><div className="w-px h-4 bg-slate-600 mx-auto"></div>{renderNode(child, level + 1)}</div>)}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-white">組織架構</h1><p className="text-gray-400">志工團隊架構</p></div>
                <div className="flex gap-2">
                    <button onClick={fetchOrgChart} disabled={loading} className="px-4 py-2 border border-slate-700 text-gray-300 rounded-lg hover:bg-slate-700 disabled:opacity-50">
                        {loading ? '載入中...' : '重新整理'}
                    </button>
                    <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400">編輯架構</button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#94a3b8' }}>
                    載入組織架構中...
                </div>
            )}

            {!loading && orgData && (
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8 overflow-x-auto">
                    <div className="flex justify-center min-w-max">{renderNode(orgData)}</div>
                </div>
            )}

            {!loading && !orgData && !error && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    暫無組織資料
                </div>
            )}

            <div className="text-center text-gray-400 text-sm">點擊節點可展開或收合</div>
        </div>
    );
}
