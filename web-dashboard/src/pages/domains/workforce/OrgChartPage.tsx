/**
 * 組織架構圖
 *
 * FE-4 遷移範本（3.1 示範頁 2/3）：utils/api → src/api/client + react-query
 * 見 docs/architecture/API_CLIENT_CONSOLIDATION.md §「遷移模式 B：串接式多請求」
 *
 * 重點：原本在 fetch 的 catch/finally 裡同時做「載入狀態」與「衍生 UI 狀態」
 * （auto-expand 前兩層）。遷移後 queryFn 只負責取資料 + normalize，
 * 衍生狀態改由 `useMemo` 從 query 結果推導，避免 setState-in-effect。
 *
 * R3b 視覺重建：archetype 採「custom / Detail 基底」——組織圖是可展開的樹狀
 * 視覺化元件，不是列表/看板，故不強套 List/Board 骨架；節點卡片維持自訂樹狀
 * 版型（連接線、置中排列），但改用語義 token 與 design-system 原子元件
 * （Button/Alert/Badge），不再依賴專案未啟用 PostCSS 的 Tailwind className。
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
// 保留 lucide（R5/T6 誠實清單）：Network（組織圖/節點網，無 B3c 對應）
import { Network } from 'lucide-react';
import { SyncIcon, EditIcon, ChevronDownIcon, ChevronRightIcon } from '../../../design-system/icons';
import api from '../../../api/client';
import { getApiErrorMessage } from '../../../api/errors';
import { Alert, Badge, Button } from '../../../design-system';
import EmptyState from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import './OrgChartPage.css';

interface OrgNode {
    id: string;
    name: string;
    title: string;
    type?: string;
    department: string;
    children?: OrgNode[];
}

const orgChartKeys = {
    tree: () => ['org-chart', 'tree'] as const,
};

/** 後端 org node 格式 → 前端 interface */
const normalizeNode = (node: any): OrgNode => ({
    id: node.id || node._id,
    name: node.name || node.managerName || '未命名',
    title: node.title || node.type || '',
    department: node.department || node.metadata?.department || node.type || '',
    children: node.children?.map((c: any) => normalizeNode(c)),
});

export default function OrgChartPage() {
    const [nodeOverrides, setNodeOverrides] = useState<Record<string, boolean>>({});

    const {
        data: orgData = null,
        isFetching: loading,
        error: queryError,
        refetch: fetchOrgChart,
    } = useQuery({
        queryKey: orgChartKeys.tree(),
        queryFn: async ({ signal }): Promise<OrgNode | null> => {
            // 串接式請求：先取 stats 找 rootId，再取該 root 的樹
            const statsRes = await api.get('/org-chart/stats', { signal });
            const stats = statsRes.data?.data || statsRes.data || {};
            const rootId = stats.rootId || 'root';

            const treeRes = await api.get(`/org-chart/tree/${rootId}`, { signal });
            const treeData = treeRes.data?.data || treeRes.data;
            return treeData ? normalizeNode(treeData) : null;
        },
    });

    const error = queryError ? getApiErrorMessage(queryError, '無法載入組織架構') : null;

    // 預設展開前兩層：由 query 結果推導（不再靠 setState-in-effect）
    const defaultExpanded = useMemo(() => {
        const ids = new Set<string>();
        if (orgData) {
            ids.add(orgData.id);
            orgData.children?.forEach(c => ids.add(c.id));
        }
        return ids;
    }, [orgData]);

    /** 使用者手動 toggle 的覆寫值；未覆寫者沿用 defaultExpanded */
    const isNodeExpanded = (id: string) => nodeOverrides[id] ?? defaultExpanded.has(id);

    const toggleNode = (id: string) => {
        setNodeOverrides(prev => ({ ...prev, [id]: !(prev[id] ?? defaultExpanded.has(id)) }));
    };

    const renderNode = (node: OrgNode, level: number = 0) => {
        const hasChildren = !!node.children && node.children.length > 0;
        const isExpanded = isNodeExpanded(node.id);
        const cardContent = (
            <>
                <span className="org-node__avatar" aria-hidden="true">{node.name.charAt(0)}</span>
                <h4 className="org-node__name">{node.name}</h4>
                <p className="org-node__title">{node.title}</p>
                <p className="org-node__dept">{node.department}</p>
                {hasChildren && (
                    <span className="org-node__toggle">
                        {isExpanded ? <ChevronDownIcon size={12} aria-hidden="true" /> : <ChevronRightIcon size={12} aria-hidden="true" />}
                        {node.children?.length} 成員
                    </span>
                )}
            </>
        );

        return (
            <div key={node.id} className="org-node">
                {hasChildren ? (
                    <button
                        type="button"
                        className={`org-node__card ${level === 0 ? 'org-node__card--root' : ''}`}
                        onClick={() => toggleNode(node.id)}
                        aria-expanded={isExpanded}
                    >
                        {cardContent}
                    </button>
                ) : (
                    <div className={`org-node__card ${level === 0 ? 'org-node__card--root' : ''}`}>
                        {cardContent}
                    </div>
                )}
                {hasChildren && isExpanded && (
                    <div className="org-node__children">
                        <div className="org-node__connector" />
                        <div className="org-node__children-row">
                            {node.children?.map((child) => (
                                <div key={child.id} className="org-node__child">
                                    <div className="org-node__connector" />
                                    {renderNode(child, level + 1)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="org-chart-page">
            <div className="page-header">
                <div className="page-header__titles">
                    <h1>組織架構</h1>
                    <p className="page-header__subtitle">志工團隊架構</p>
                </div>
                <div className="org-chart-page__actions">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => fetchOrgChart()}
                        disabled={loading}
                        icon={<SyncIcon size={16} aria-hidden="true" />}
                    >
                        {loading ? '載入中...' : '重新整理'}
                    </Button>
                    <Button variant="primary" size="sm" icon={<EditIcon size={16} aria-hidden="true" />}>
                        編輯架構
                    </Button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="danger" title="載入失敗" className="org-chart-page__alert">
                    <div className="org-chart-page__alert-body">
                        <span>{error}</span>
                        <Button variant="secondary" size="sm" onClick={() => fetchOrgChart()}>重試</Button>
                    </div>
                </Alert>
            )}

            {/* Loading */}
            {loading && (
                <div className="org-chart-page__skeleton" role="status" aria-label="載入組織架構中">
                    <Skeleton variant="card" height={140} count={3} />
                </div>
            )}

            {!loading && orgData && (
                <div className="org-chart-canvas">
                    <div className="org-chart-canvas__inner">{renderNode(orgData)}</div>
                </div>
            )}

            {!loading && !orgData && !error && (
                <EmptyState icon={Network} variant="minimal" title="暫無組織資料" description="請稍後再試，或聯繫管理員設定組織架構" />
            )}

            {!loading && orgData && (
                <div className="org-chart-page__hint">
                    <Badge variant="default" size="sm">提示</Badge>
                    <span>點擊節點可展開或收合</span>
                </div>
            )}
        </div>
    );
}
