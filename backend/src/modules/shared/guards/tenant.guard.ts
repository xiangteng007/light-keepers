/**
 * Tenant Guard - Multi-tenancy Row-Level Security
 * 
 * Validates that the authenticated user belongs to the tenant
 * being accessed, preventing cross-tenant data access.
 * 
 * Usage:
 * @UseGuards(CoreJwtGuard, TenantGuard)
 * @Get()
 * async findAll() { ... }
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Decorator metadata key
export const TENANT_CONFIG_KEY = 'tenantConfig';
export const TENANT_BYPASS_KEY = 'tenantBypass';

// Configuration interface
export interface TenantConfig {
    /**
     * Query parameter or route parameter name for tenant ID
     * Default: looks for 'tenantId' in query, params, body, or user object
     */
    paramName?: string;

    /**
     * Allow system-level access (no tenant restriction)
     * Default: false
     */
    allowSystemAccess?: boolean;
}

/**
 * Decorator to configure tenant validation
 */
export const TenantConfig = (config: TenantConfig) =>
    SetMetadata(TENANT_CONFIG_KEY, config);

/**
 * Decorator to bypass tenant check for specific endpoints
 */
export const BypassTenantCheck = () =>
    SetMetadata(TENANT_BYPASS_KEY, true);

/**
 * Guard that validates tenant access
 */
@Injectable()
export class TenantGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if tenant check should be bypassed
        const bypass = this.reflector.getAllAndOverride<boolean>(
            TENANT_BYPASS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (bypass) {
            return true;
        }

        // Get configuration from decorator
        const config = this.reflector.getAllAndOverride<TenantConfig>(
            TENANT_CONFIG_KEY,
            [context.getHandler(), context.getClass()],
        ) || {};

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Must be authenticated
        if (!user) {
            throw new ForbiddenException('未登入');
        }

        // System users (INCIDENT_COMMANDER level) can access all tenants
        if (config.allowSystemAccess && user.roleLevel >= 6) {
            return true;
        }

        // Get user's tenant ID
        const userTenantId = user.tenantId || user.organizationId;

        // If user has no tenant, deny access to tenant-specific resources
        if (!userTenantId) {
            throw new ForbiddenException('用戶未關聯任何組織');
        }

        // Get requested tenant ID from various sources
        const paramName = config.paramName || 'tenantId';
        const requestedTenantId = 
            request.params[paramName] ||
            request.query[paramName] ||
            request.body?.[paramName];

        // If no tenant specified in request, inject user's tenant
        if (!requestedTenantId) {
            // Inject user's tenant ID into request for downstream use
            request.tenantId = userTenantId;
            return true;
        }

        // Validate tenant access
        if (requestedTenantId !== userTenantId) {
            console.warn(
                `[TenantGuard] Cross-tenant access attempt: ` +
                `User ${user.sub} (tenant: ${userTenantId}) tried to access tenant ${requestedTenantId}`
            );
            throw new ForbiddenException('無權存取此組織資源');
        }

        // Set tenant ID in request for downstream use
        request.tenantId = userTenantId;

        return true;
    }
}

/**
 * Tenant Query Subscriber
 * Auto-injects tenant filter in TypeORM queries
 */
export const TENANT_FILTER_KEY = Symbol('TENANT_FILTER');

export interface TenantAware {
    tenantId: string;
}
