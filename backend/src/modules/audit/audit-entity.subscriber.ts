/**
 * audit-entity.subscriber.ts
 * 
 * TypeORM EntitySubscriber for automatic entity change auditing.
 * Captures INSERT, UPDATE, DELETE operations on specified entities.
 */
import {
    EntitySubscriberInterface,
    InsertEvent,
    UpdateEvent,
    RemoveEvent,
    EventSubscriber,
    DataSource,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';

// Entities to track (high-value entities for audit compliance)
const AUDITED_ENTITIES = [
    'Account',
    'MissionSession',
    'FieldReport',
    'TriageRecord',
    'Shelter',
    'ShelterEvacuee',
    'ShelterHealthScreening',
    'Task',
    'VolunteerMobilization',
    'MobilizationResponse',
    'StructuralAssessment',
    'Reunification',
    'Resource',
    'Dispatch',
    'Approval',
];

@Injectable()
@EventSubscriber()
export class AuditEntitySubscriber implements EntitySubscriberInterface {
    private readonly logger = new Logger(AuditEntitySubscriber.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {
        // Register this subscriber with the data source
        dataSource.subscribers.push(this);
    }

    /**
     * Check if entity should be audited
     */
    private shouldAudit(entityName: string): boolean {
        return AUDITED_ENTITIES.includes(entityName);
    }

    /**
     * Extract user ID from entity if available
     */
    private extractUserId(entity: any): string | undefined {
        return entity?.userId || entity?.createdBy || entity?.updatedBy || undefined;
    }

    /**
     * Called after entity is inserted
     */
    async afterInsert(event: InsertEvent<any>): Promise<void> {
        const entityName = event.metadata.name;
        if (!this.shouldAudit(entityName)) return;

        try {
            const auditLog = new AuditLog();
            Object.assign(auditLog, {
                action: 'CREATE',
                resourceType: entityName,
                resourceId: event.entity?.id || 'unknown',
                userId: this.extractUserId(event.entity),
                description: `Entity ${entityName} created`,
                newState: this.sanitizeEntity(event.entity),
                success: true,
            });

            await event.manager.save(AuditLog, auditLog);
            this.logger.debug(`Audit: Created ${entityName}/${event.entity?.id}`);
        } catch (error) {
            this.logger.error(`Failed to audit INSERT for ${entityName}: ${error.message}`);
        }
    }

    /**
     * Called after entity is updated
     */
    async afterUpdate(event: UpdateEvent<any>): Promise<void> {
        const entityName = event.metadata.name;
        if (!this.shouldAudit(entityName)) return;

        try {
            const auditLog = new AuditLog();
            Object.assign(auditLog, {
                action: 'UPDATE',
                resourceType: entityName,
                resourceId: event.entity?.id || event.databaseEntity?.id || 'unknown',
                userId: this.extractUserId(event.entity),
                description: `Entity ${entityName} updated`,
                previousState: this.sanitizeEntity(event.databaseEntity),
                newState: this.sanitizeEntity(event.entity),
                success: true,
            });

            await event.manager.save(AuditLog, auditLog);
            this.logger.debug(`Audit: Updated ${entityName}/${event.entity?.id}`);
        } catch (error) {
            this.logger.error(`Failed to audit UPDATE for ${entityName}: ${error.message}`);
        }
    }

    /**
     * Called after entity is removed
     */
    async afterRemove(event: RemoveEvent<any>): Promise<void> {
        const entityName = event.metadata.name;
        if (!this.shouldAudit(entityName)) return;

        try {
            const auditLog = new AuditLog();
            Object.assign(auditLog, {
                action: 'DELETE',
                resourceType: entityName,
                resourceId: event.entityId || event.databaseEntity?.id || 'unknown',
                userId: this.extractUserId(event.databaseEntity),
                description: `Entity ${entityName} deleted`,
                previousState: this.sanitizeEntity(event.databaseEntity),
                success: true,
            });

            await event.manager.save(AuditLog, auditLog);
            this.logger.debug(`Audit: Deleted ${entityName}/${event.entityId}`);
        } catch (error) {
            this.logger.error(`Failed to audit DELETE for ${entityName}: ${error.message}`);
        }
    }

    /**
     * Sanitize entity for storage (remove circular refs, large blobs)
     */
    private sanitizeEntity(entity: any): Record<string, any> | undefined {
        if (!entity) return undefined;
        
        try {
            // Create a shallow copy with only primitive values and simple objects
            const sanitized: Record<string, any> = {};
            for (const [key, value] of Object.entries(entity)) {
                // Skip functions, symbols, and large binary data
                if (typeof value === 'function' || typeof value === 'symbol') continue;
                if (value instanceof Buffer || value instanceof ArrayBuffer) continue;
                
                // Skip circular reference prone fields
                if (key.endsWith('Relation') || key === 'dataSource') continue;
                
                // Handle dates
                if (value instanceof Date) {
                    sanitized[key] = value.toISOString();
                    continue;
                }
                
                // Handle simple arrays and objects
                if (typeof value === 'object' && value !== null) {
                    try {
                        // Attempt to stringify to detect circular references
                        JSON.stringify(value);
                        sanitized[key] = value;
                    } catch {
                        // Skip if circular
                        sanitized[key] = '[Complex Object]';
                    }
                } else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        } catch {
            return { error: 'Failed to sanitize entity' };
        }
    }
}
