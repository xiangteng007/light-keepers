import { Injectable, Logger, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

/**
 * Multi-Tenant Service
 * Support multiple branches/organizations
 */
@Injectable({ scope: Scope.REQUEST })
export class MultiTenantService {
    private readonly logger = new Logger(MultiTenantService.name);
    private tenants: Map<string, Tenant> = new Map();
    private currentTenantId: string | null = null;

    constructor(@Inject(REQUEST) private request: Request) {
        this.initializeTenants();
        this.currentTenantId = this.resolveTenant();
    }

    private initializeTenants() {
        // 預設租戶
        const defaultTenants: Tenant[] = [
            { id: 'main', name: '總會', code: 'HQ', region: '全國', status: 'active' },
            { id: 'north', name: '北區分會', code: 'N', region: '台北/新北/基隆', status: 'active' },
            { id: 'central', name: '中區分會', code: 'C', region: '台中/彰化/南投', status: 'active' },
            { id: 'south', name: '南區分會', code: 'S', region: '高雄/台南/屏東', status: 'active' },
            { id: 'east', name: '東區分會', code: 'E', region: '花蓮/台東', status: 'active' },
        ];
        defaultTenants.forEach((t) => this.tenants.set(t.id, t));
    }

    /**
     * 解析當前租戶
     */
    private resolveTenant(): string | null {
        // 從 header 解析
        const tenantHeader = this.request?.headers?.['x-tenant-id'];
        if (tenantHeader) return String(tenantHeader);

        // 從 subdomain 解析
        const host = this.request?.headers?.host;
        if (host) {
            const match = host.match(/^(\w+)\./);
            if (match && this.tenants.has(match[1])) {
                return match[1];
            }
        }

        return 'main'; // 預設
    }

    /**
     * 取得當前租戶
     */
    getCurrentTenant(): Tenant | null {
        if (!this.currentTenantId) return null;
        return this.tenants.get(this.currentTenantId) || null;
    }

    /**
     * 取得當前租戶 ID
     */
    getTenantId(): string {
        return this.currentTenantId || 'main';
    }

    /**
     * 取得所有租戶
     */
    getAllTenants(): Tenant[] {
        return Array.from(this.tenants.values());
    }

    /**
     * 取得租戶資料篩選條件
     */
    getDataFilter(): { tenantId: string } {
        return { tenantId: this.getTenantId() };
    }

    /**
     * 檢查是否為總會
     */
    isHeadquarters(): boolean {
        return this.currentTenantId === 'main';
    }

    /**
     * 檢查是否可存取其他租戶
     */
    canAccessTenant(targetTenantId: string): boolean {
        // 總會可以存取所有
        if (this.isHeadquarters()) return true;
        // 其他只能存取自己
        return this.currentTenantId === targetTenantId;
    }

    /**
     * 新增租戶
     */
    addTenant(tenant: Omit<Tenant, 'status'>): Tenant {
        const newTenant: Tenant = { ...tenant, status: 'active' };
        this.tenants.set(tenant.id, newTenant);
        return newTenant;
    }
}

interface Tenant {
    id: string;
    name: string;
    code: string;
    region: string;
    status: 'active' | 'inactive' | 'suspended';
    settings?: Record<string, any>;
}
