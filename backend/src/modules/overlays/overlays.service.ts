import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import {
    MissionOverlay,
    OverlayState,
    OverlayType,
} from './entities/mission-overlay.entity';
import { OverlayLock } from './entities/overlay-lock.entity';
import { OverlayAuditLog } from './entities/overlay-audit-log.entity';
import {
    CreateOverlayDto,
    UpdateOverlayDto,
    OverlayDto,
    QueryOverlaysDto,
} from './dto';

// Lock expiration time in milliseconds (2 minutes)
const LOCK_EXPIRATION_MS = 2 * 60 * 1000;

@Injectable()
export class OverlaysService {
    private readonly logger = new Logger(OverlaysService.name);

    constructor(
        @InjectRepository(MissionOverlay)
        private readonly overlayRepo: Repository<MissionOverlay>,
        @InjectRepository(OverlayLock)
        private readonly lockRepo: Repository<OverlayLock>,
        @InjectRepository(OverlayAuditLog)
        private readonly auditRepo: Repository<OverlayAuditLog>,
    ) { }

    /**
     * Find all overlays for a session with optional filtering
     */
    async findAll(sessionId: string, query: QueryOverlaysDto): Promise<OverlayDto[]> {
        const qb = this.overlayRepo.createQueryBuilder('o')
            .where('o.sessionId = :sessionId', { sessionId });

        // Incremental sync support
        if (query.since) {
            const sinceDate = new Date(query.since);
            qb.andWhere('o.updatedAt > :since', { since: sinceDate });
        }

        // Type filter
        if (query.type) {
            qb.andWhere('o.type = :type', { type: query.type });
        }

        // State filter
        if (query.state) {
            qb.andWhere('o.state = :state', { state: query.state });
        } else if (!query.includeRemoved) {
            qb.andWhere('o.state != :removed', { removed: OverlayState.REMOVED });
        }

        qb.orderBy('o.updatedAt', 'DESC');

        const overlays = await qb.getMany();

        // Fetch locks for these overlays
        const overlayIds = overlays.map(o => o.id);
        const locks = overlayIds.length > 0
            ? await this.lockRepo.find({
                where: { overlayId: In(overlayIds) },
            })
            : [];
        const lockMap = new Map(locks.map(l => [l.overlayId, l]));

        // Map to DTOs with lock info
        return overlays.map(o => this.toDto(o, lockMap.get(o.id)));
    }

    /**
     * Find a single overlay by ID
     */
    async findOne(id: string): Promise<OverlayDto> {
        const overlay = await this.overlayRepo.findOne({ where: { id } });
        if (!overlay) {
            throw new NotFoundException(`Overlay ${id} not found`);
        }

        const lock = await this.lockRepo.findOne({ where: { overlayId: id } });
        return this.toDto(overlay, lock ?? undefined);
    }

    /**
     * Create a new overlay
     */
    async create(
        sessionId: string,
        dto: CreateOverlayDto,
        userId: string,
    ): Promise<OverlayDto> {
        const overlay = this.overlayRepo.create({
            sessionId,
            type: dto.type,
            code: dto.code,
            name: dto.name,
            geometry: dto.geometry,
            hazardType: dto.hazardType,
            severity: dto.severity,
            hazardStatus: dto.hazardStatus,
            confidence: dto.confidence,
            poiType: dto.poiType,
            capacity: dto.capacity,
            locationId: dto.locationId,
            followLocation: dto.followLocation ?? false,
            props: dto.props ?? {},
            state: OverlayState.DRAFT,
            version: 1,
            createdBy: userId,
            updatedBy: userId,
        });

        const saved = await this.overlayRepo.save(overlay);

        // Audit log
        await this.createAuditLog(saved.id, sessionId, 'create', userId, null, saved);

        this.logger.log(`Created overlay ${saved.id} for session ${sessionId}`);
        return this.toDto(saved);
    }

    /**
     * Update an overlay with optimistic locking
     */
    async update(
        id: string,
        dto: UpdateOverlayDto,
        expectedVersion: number,
        userId: string,
    ): Promise<OverlayDto> {
        const overlay = await this.overlayRepo.findOne({ where: { id } });
        if (!overlay) {
            throw new NotFoundException(`Overlay ${id} not found`);
        }

        // Version check (optimistic locking)
        if (overlay.version !== expectedVersion) {
            throw new ConflictException(
                `Version conflict: expected ${expectedVersion}, found ${overlay.version}`,
            );
        }

        // Check lock if exists
        const lock = await this.lockRepo.findOne({ where: { overlayId: id } });
        if (lock && lock.lockedBy !== userId && lock.expiresAt > new Date()) {
            throw new ForbiddenException(`Overlay is locked by ${lock.lockedBy}`);
        }

        const beforeState = { ...overlay };

        // Apply updates
        if (dto.code !== undefined) overlay.code = dto.code;
        if (dto.name !== undefined) overlay.name = dto.name;
        if (dto.geometry !== undefined) overlay.geometry = dto.geometry;
        if (dto.hazardType !== undefined) overlay.hazardType = dto.hazardType;
        if (dto.severity !== undefined) overlay.severity = dto.severity;
        if (dto.hazardStatus !== undefined) overlay.hazardStatus = dto.hazardStatus;
        if (dto.confidence !== undefined) overlay.confidence = dto.confidence;
        if (dto.poiType !== undefined) overlay.poiType = dto.poiType;
        if (dto.capacity !== undefined) overlay.capacity = dto.capacity;
        if (dto.locationId !== undefined) overlay.locationId = dto.locationId;
        if (dto.followLocation !== undefined) overlay.followLocation = dto.followLocation;
        if (dto.props !== undefined) overlay.props = dto.props;

        overlay.version += 1;
        overlay.updatedBy = userId;

        const saved = await this.overlayRepo.save(overlay);

        // Audit log
        await this.createAuditLog(id, overlay.sessionId, 'update', userId, beforeState, saved);

        return this.toDto(saved, lock ?? undefined);
    }

    /**
     * Publish an overlay (draft -> published)
     */
    async publish(id: string, userId: string): Promise<OverlayDto> {
        const overlay = await this.overlayRepo.findOne({ where: { id } });
        if (!overlay) {
            throw new NotFoundException(`Overlay ${id} not found`);
        }

        if (overlay.state === OverlayState.REMOVED) {
            throw new ConflictException('Cannot publish a removed overlay');
        }

        const beforeState = { ...overlay };
        overlay.state = OverlayState.PUBLISHED;
        overlay.version += 1;
        overlay.updatedBy = userId;

        const saved = await this.overlayRepo.save(overlay);

        await this.createAuditLog(id, overlay.sessionId, 'publish', userId, beforeState, saved);

        return this.toDto(saved);
    }

    /**
     * Soft delete an overlay
     */
    async remove(id: string, userId: string): Promise<void> {
        const overlay = await this.overlayRepo.findOne({ where: { id } });
        if (!overlay) {
            throw new NotFoundException(`Overlay ${id} not found`);
        }

        const beforeState = { ...overlay };
        overlay.state = OverlayState.REMOVED;
        overlay.removedAt = new Date();
        overlay.removedBy = userId;
        overlay.version += 1;
        overlay.updatedBy = userId;

        await this.overlayRepo.save(overlay);

        // Release any lock
        await this.lockRepo.delete({ overlayId: id });

        await this.createAuditLog(id, overlay.sessionId, 'remove', userId, beforeState, overlay);
    }

    /**
     * Acquire a lock on an overlay
     */
    async acquireLock(overlayId: string, userId: string): Promise<{ success: boolean; expiresAt: Date }> {
        const overlay = await this.overlayRepo.findOne({ where: { id: overlayId } });
        if (!overlay) {
            throw new NotFoundException(`Overlay ${overlayId} not found`);
        }

        const existing = await this.lockRepo.findOne({ where: { overlayId } });
        const now = new Date();

        if (existing) {
            if (existing.lockedBy === userId) {
                // Refresh lock
                existing.expiresAt = new Date(now.getTime() + LOCK_EXPIRATION_MS);
                await this.lockRepo.save(existing);
                return { success: true, expiresAt: existing.expiresAt };
            }

            if (existing.expiresAt > now) {
                // Lock held by someone else
                throw new ConflictException(`Overlay is locked by ${existing.lockedBy}`);
            }

            // Expired lock - take over
            existing.lockedBy = userId;
            existing.lockedAt = now;
            existing.expiresAt = new Date(now.getTime() + LOCK_EXPIRATION_MS);
            await this.lockRepo.save(existing);
            return { success: true, expiresAt: existing.expiresAt };
        }

        // Create new lock
        const lock = this.lockRepo.create({
            overlayId,
            lockedBy: userId,
            lockedAt: now,
            expiresAt: new Date(now.getTime() + LOCK_EXPIRATION_MS),
        });
        await this.lockRepo.save(lock);

        return { success: true, expiresAt: lock.expiresAt };
    }

    /**
     * Release a lock on an overlay
     */
    async releaseLock(overlayId: string, userId: string): Promise<{ success: boolean }> {
        const lock = await this.lockRepo.findOne({ where: { overlayId } });
        if (!lock) {
            return { success: true }; // No lock to release
        }

        if (lock.lockedBy !== userId) {
            throw new ForbiddenException('Cannot release lock held by another user');
        }

        await this.lockRepo.delete({ overlayId });
        return { success: true };
    }

    /**
     * Helper: Create audit log entry
     */
    private async createAuditLog(
        overlayId: string,
        sessionId: string,
        action: string,
        actor: string,
        beforeState: any,
        afterState: any,
    ): Promise<void> {
        const log = new OverlayAuditLog();
        log.overlayId = overlayId;
        log.sessionId = sessionId;
        log.action = action;
        log.actor = actor;
        log.beforeState = beforeState ? this.sanitizeForAudit(beforeState) : null as any;
        log.afterState = afterState ? this.sanitizeForAudit(afterState) : null as any;
        await this.auditRepo.save(log);
    }

    /**
     * Helper: Sanitize entity for audit log (remove circular refs)
     */
    private sanitizeForAudit(entity: any): Record<string, any> {
        const { session, ...rest } = entity;
        return rest;
    }

    /**
     * Helper: Map entity to DTO
     */
    private toDto(overlay: MissionOverlay, lock?: OverlayLock): OverlayDto {
        return {
            id: overlay.id,
            sessionId: overlay.sessionId,
            type: overlay.type,
            code: overlay.code,
            name: overlay.name,
            geometry: overlay.geometry as any,
            hazardType: overlay.hazardType,
            severity: overlay.severity,
            hazardStatus: overlay.hazardStatus,
            confidence: overlay.confidence,
            poiType: overlay.poiType,
            capacity: overlay.capacity,
            locationId: overlay.locationId,
            followLocation: overlay.followLocation,
            props: overlay.props,
            state: overlay.state,
            version: overlay.version,
            createdBy: overlay.createdBy,
            updatedBy: overlay.updatedBy,
            createdAt: overlay.createdAt,
            updatedAt: overlay.updatedAt,
            lockedBy: lock?.lockedBy,
            lockedUntil: lock?.expiresAt,
        };
    }
}
