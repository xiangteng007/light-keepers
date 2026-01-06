import { Injectable, Logger } from '@nestjs/common';

/**
 * Org Chart Service
 * Organization structure management
 */
@Injectable()
export class OrgChartService {
    private readonly logger = new Logger(OrgChartService.name);
    private nodes: Map<string, OrgNode> = new Map();

    constructor() {
        this.initializeDefaultStructure();
    }

    private initializeDefaultStructure() {
        this.addNode({ id: 'root', name: '總會', type: 'organization', parentId: null });
        this.addNode({ id: 'north', name: '北區分會', type: 'division', parentId: 'root' });
        this.addNode({ id: 'central', name: '中區分會', type: 'division', parentId: 'root' });
        this.addNode({ id: 'south', name: '南區分會', type: 'division', parentId: 'root' });
    }

    /**
     * 新增節點
     */
    addNode(input: NodeInput): OrgNode {
        const node: OrgNode = {
            id: input.id || `node-${Date.now()}`,
            name: input.name,
            type: input.type,
            parentId: input.parentId,
            managerId: input.managerId,
            metadata: input.metadata || {},
            createdAt: new Date(),
        };

        this.nodes.set(node.id, node);
        return node;
    }

    /**
     * 取得節點
     */
    getNode(id: string): OrgNode | undefined {
        return this.nodes.get(id);
    }

    /**
     * 更新節點
     */
    updateNode(id: string, updates: Partial<NodeInput>): OrgNode | null {
        const node = this.nodes.get(id);
        if (!node) return null;

        if (updates.name) node.name = updates.name;
        if (updates.parentId !== undefined) node.parentId = updates.parentId;
        if (updates.managerId !== undefined) node.managerId = updates.managerId;
        if (updates.metadata) Object.assign(node.metadata, updates.metadata);

        return node;
    }

    /**
     * 刪除節點
     */
    deleteNode(id: string): boolean {
        // 不能刪除有子節點的節點
        const hasChildren = Array.from(this.nodes.values()).some((n) => n.parentId === id);
        if (hasChildren) return false;

        return this.nodes.delete(id);
    }

    /**
     * 取得子節點
     */
    getChildren(parentId: string): OrgNode[] {
        return Array.from(this.nodes.values()).filter((n) => n.parentId === parentId);
    }

    /**
     * 取得完整樹狀結構
     */
    getTree(rootId: string = 'root'): TreeNode | null {
        const root = this.nodes.get(rootId);
        if (!root) return null;

        return this.buildTree(root);
    }

    /**
     * 取得路徑 (從節點到根)
     */
    getPath(nodeId: string): OrgNode[] {
        const path: OrgNode[] = [];
        let current = this.nodes.get(nodeId);

        while (current) {
            path.unshift(current);
            current = current.parentId ? this.nodes.get(current.parentId) : undefined;
        }

        return path;
    }

    /**
     * 搜尋節點
     */
    search(query: string): OrgNode[] {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.nodes.values()).filter((n) =>
            n.name.toLowerCase().includes(lowerQuery));
    }

    /**
     * 移動節點
     */
    moveNode(nodeId: string, newParentId: string): boolean {
        const node = this.nodes.get(nodeId);
        const newParent = this.nodes.get(newParentId);

        if (!node || !newParent) return false;

        // 防止循環
        if (this.isDescendant(newParentId, nodeId)) return false;

        node.parentId = newParentId;
        return true;
    }

    /**
     * 取得統計
     */
    getStats(): OrgStats {
        const nodes = Array.from(this.nodes.values());
        const byType: Record<string, number> = {};

        for (const node of nodes) {
            byType[node.type] = (byType[node.type] || 0) + 1;
        }

        return {
            totalNodes: nodes.length,
            byType,
            maxDepth: this.calculateMaxDepth('root'),
        };
    }

    /**
     * 匯出為扁平列表
     */
    exportFlat(): OrgNode[] {
        return Array.from(this.nodes.values());
    }

    private buildTree(node: OrgNode): TreeNode {
        const children = this.getChildren(node.id);
        return {
            ...node,
            children: children.map((c) => this.buildTree(c)),
        };
    }

    private isDescendant(nodeId: string, potentialAncestorId: string): boolean {
        let current = this.nodes.get(nodeId);
        while (current) {
            if (current.id === potentialAncestorId) return true;
            current = current.parentId ? this.nodes.get(current.parentId) : undefined;
        }
        return false;
    }

    private calculateMaxDepth(nodeId: string, depth: number = 0): number {
        const children = this.getChildren(nodeId);
        if (children.length === 0) return depth;
        return Math.max(...children.map((c) => this.calculateMaxDepth(c.id, depth + 1)));
    }
}

// Types
interface NodeInput { id?: string; name: string; type: string; parentId: string | null; managerId?: string; metadata?: Record<string, any>; }
interface OrgNode { id: string; name: string; type: string; parentId: string | null; managerId?: string; metadata: Record<string, any>; createdAt: Date; }
interface TreeNode extends OrgNode { children: TreeNode[]; }
interface OrgStats { totalNodes: number; byType: Record<string, number>; maxDepth: number; }
