import { apiClient } from './config';

export interface OrgNode {
    id: string;
    name: string;
    type: 'organization' | 'division' | 'branch' | 'team' | 'unit';
    parentId: string | null;
    managerId?: string;
    metadata: Record<string, any>;
    createdAt: string;
}

export interface TreeNode extends OrgNode {
    children: TreeNode[];
}

export interface OrgStats {
    totalNodes: number;
    byType: Record<string, number>;
    maxDepth: number;
}

export const orgChartApi = {
    // 取得完整樹狀結構
    getTree: (rootId: string = 'root') =>
        apiClient.get(`/org-chart/tree/${rootId}`),

    // 取得節點
    getNode: (id: string) =>
        apiClient.get(`/org-chart/nodes/${id}`),

    // 新增節點
    addNode: (data: {
        id?: string;
        name: string;
        type: string;
        parentId: string | null;
        managerId?: string;
        metadata?: Record<string, any>;
    }) => apiClient.post('/org-chart/nodes', data),

    // 更新節點
    updateNode: (id: string, updates: Partial<OrgNode>) =>
        apiClient.patch(`/org-chart/nodes/${id}`, updates),

    // 刪除節點
    deleteNode: (id: string) =>
        apiClient.delete(`/org-chart/nodes/${id}`),

    // 取得子節點
    getChildren: (parentId: string) =>
        apiClient.get(`/org-chart/nodes/${parentId}/children`),

    // 搜尋節點
    search: (query: string) =>
        apiClient.get('/org-chart/search', { params: { q: query } }),

    // 移動節點
    moveNode: (nodeId: string, newParentId: string) =>
        apiClient.post('/org-chart/move', { nodeId, newParentId }),

    // 取得統計
    getStats: () =>
        apiClient.get('/org-chart/stats'),

    // 取得路徑
    getPath: (nodeId: string) =>
        apiClient.get(`/org-chart/path/${nodeId}`),

    // 匯出扁平列表
    exportFlat: () =>
        apiClient.get('/org-chart/export'),
};
