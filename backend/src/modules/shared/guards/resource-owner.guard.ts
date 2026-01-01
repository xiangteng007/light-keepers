/**
 * Resource Owner Guard - IDOR Protection
 * 
 * Validates that the authenticated user owns the requested resource,
 * or has elevated privileges (OFFICER+) to access all resources.
 * 
 * Usage:
 * @UseGuards(CoreJwtGuard, ResourceOwnerGuard)
 * @ResourceOwner({ entity: 'Report', ownerField: 'reporterId', idParam: 'id' })
 * @Get(':id')
 * async findOne(@Param('id') id: string) { ... }
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';

// Decorator metadata key
export const RESOURCE_OWNER_KEY = 'resourceOwner';

// Configuration interface
export interface ResourceOwnerConfig {
    /**
     * Entity class name (e.g., 'Report', 'Volunteer')
     * Must match the TypeORM entity class name
     */
    entity: string;

    /**
     * Field name that stores the owner's account ID
     * e.g., 'reporterId', 'accountId', 'createdBy'
     */
    ownerField: string;

    /**
     * Route parameter name for the resource ID (default: 'id')
     */
    idParam?: string;

    /**
     * Minimum role level to bypass ownership check (default: 5 = OFFICER)
     * Set to Infinity to always require ownership
     */
    bypassLevel?: number;

    /**
     * Allow the resource owner to access even if they have low role level
     * Default: true
     */
    allowOwner?: boolean;
}

/**
 * Decorator to mark an endpoint as requiring resource ownership validation
 */
export const ResourceOwner = (config: ResourceOwnerConfig) =>
    SetMetadata(RESOURCE_OWNER_KEY, config);

/**
 * Guard that validates resource ownership
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly dataSource: DataSource,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get configuration from decorator
        const config = this.reflector.get<ResourceOwnerConfig>(
            RESOURCE_OWNER_KEY,
            context.getHandler(),
        );

        // If no config, allow (decorator not used)
        if (!config) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Must be authenticated
        if (!user || !user.sub) {
            throw new ForbiddenException('未登入');
        }

        // Check if user can bypass ownership check (high privilege)
        const bypassLevel = config.bypassLevel ?? 5; // Default: OFFICER (level 5)
        const userLevel = user.roleLevel ?? 0;

        if (userLevel >= bypassLevel) {
            // High privilege user - allow access
            return true;
        }

        // Get resource ID from route params
        const idParam = config.idParam ?? 'id';
        const resourceId = request.params[idParam];

        if (!resourceId) {
            // No ID parameter - can't check ownership, deny
            throw new ForbiddenException('無法驗證資源擁有權');
        }

        // Query the entity to check ownership
        const entity = await this.findEntity(config.entity, resourceId);

        if (!entity) {
            // Resource not found - let the controller handle 404
            return true;
        }

        // Check ownership
        const ownerField = config.ownerField;
        const ownerId = entity[ownerField];

        // Allow if user is the owner
        const allowOwner = config.allowOwner ?? true;
        if (allowOwner && ownerId === user.sub) {
            return true;
        }

        // Denied
        throw new ForbiddenException('您無權存取此資源');
    }

    /**
     * Find entity by ID using raw query
     * This avoids the need to inject specific repositories
     */
    private async findEntity(entityName: string, id: string): Promise<any> {
        try {
            // Get the repository for the entity
            const repository = this.dataSource.getRepository(entityName);
            return repository.findOne({ where: { id } });
        } catch (error) {
            console.error(`[ResourceOwnerGuard] Failed to find ${entityName}:`, error.message);
            return null;
        }
    }
}
