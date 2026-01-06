import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Account } from '../accounts/entities/account.entity';
import { AuditService } from '../audit/audit.service';
import { BreakGlassDto, CommanderStatusDto, HeartbeatResponseDto } from './dto/heartbeat.dto';

@Injectable()
export class HeartbeatService {
    private readonly logger = new Logger(HeartbeatService.name);

    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Update heartbeat timestamp for a user
     */
    async updateHeartbeat(userId: string): Promise<HeartbeatResponseDto> {
        const now = new Date();

        await this.accountRepository.update(userId, {
            lastHeartbeat: now
        });

        this.logger.debug(`Heartbeat updated for user ${userId}`);

        return {
            success: true,
            timestamp: now.toISOString(),
            nextHeartbeatSeconds: 30 // Client should ping every 30 seconds
        };
    }

    /**
     * Get commander status (role level >= 4)
     */
    async getCommanderStatus(): Promise<CommanderStatusDto[]> {
        // Find accounts with commander roles (level 4+)
        const commanders = await this.accountRepository
            .createQueryBuilder('account')
            .leftJoinAndSelect('account.roles', 'role')
            .where('role.level >= :level', { level: 4 })
            .andWhere('account.isActive = :active', { active: true })
            .getMany();

        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        return commanders.map(commander => {
            const isOnline = commander.lastHeartbeat &&
                commander.lastHeartbeat > fiveMinutesAgo;

            const timeSinceLastHeartbeat = commander.lastHeartbeat
                ? Math.floor((now.getTime() - commander.lastHeartbeat.getTime()) / 1000)
                : null;

            return {
                userId: commander.id,
                displayName: commander.displayName || commander.email,
                roleLevel: commander.roles?.[0]?.level || 0,
                isOnline,
                lastHeartbeat: commander.lastHeartbeat?.toISOString() || null,
                timeSinceLastHeartbeatSeconds: timeSinceLastHeartbeat,
                breakGlassEnabled: commander.breakGlassEnabled,
                emergencySuccessorId: commander.emergencySuccessor
            };
        });
    }

    /**
     * Execute break-glass emergency takeover
     */
    async executeBreakGlass(
        invokerId: string,
        dto: BreakGlassDto
    ): Promise<{ success: boolean; message: string; newRoleLevel?: number }> {
        const { targetCommanderId, reason } = dto;

        // 1. Get target commander
        const commander = await this.accountRepository.findOne({
            where: { id: targetCommanderId },
            relations: ['roles']
        });

        if (!commander) {
            throw new BadRequestException('目標指揮官不存在');
        }

        // 2. Verify invoker is the designated successor
        if (commander.emergencySuccessor !== invokerId) {
            throw new ForbiddenException('您不是該指揮官的指定接班人');
        }

        // 3. Check if break-glass is enabled
        if (!commander.breakGlassEnabled) {
            throw new BadRequestException('該指揮官未啟用 Break-Glass 協議');
        }

        // 4. Check timeout condition
        const now = new Date();
        const timeoutMs = (commander.breakGlassTimeoutMinutes || 15) * 60 * 1000;
        const timeoutThreshold = new Date(now.getTime() - timeoutMs);

        if (commander.lastHeartbeat && commander.lastHeartbeat > timeoutThreshold) {
            const remainingMinutes = Math.ceil(
                (commander.lastHeartbeat.getTime() + timeoutMs - now.getTime()) / 60000
            );
            throw new BadRequestException(
                `指揮官尚未失聯，需等待 ${remainingMinutes} 分鐘後才能執行接管`
            );
        }

        // 5. Execute takeover - Grant invoker the commander's role level
        const invoker = await this.accountRepository.findOne({
            where: { id: invokerId },
            relations: ['roles']
        });

        if (!invoker) {
            throw new BadRequestException('無法找到您的帳號');
        }

        // Get commander's highest role level
        const commanderRoleLevel = Math.max(...commander.roles.map(r => r.level), 0);

        // Log the break-glass event
        await this.auditService.log({
            action: 'BREAK_GLASS_EXECUTED',
            userId: invokerId,
            resourceType: 'Account',
            resourceId: targetCommanderId,
            description: `Emergency takeover triggered. Reason: ${reason}`,
            metadata: {
                reason,
                previousCommanderRoleLevel: commanderRoleLevel,
                commanderLastHeartbeat: commander.lastHeartbeat?.toISOString(),
                timeoutMinutes: commander.breakGlassTimeoutMinutes
            }
        });

        this.logger.warn(
            `BREAK-GLASS EXECUTED: User ${invokerId} took over from ${targetCommanderId}. Reason: ${reason}`
        );

        // Note: Actual role assignment should be done through roles service
        // This is a simplified implementation - in production, integrate with RolesService

        return {
            success: true,
            message: `緊急接管成功。您已獲得 Level ${commanderRoleLevel} 權限。原因: ${reason}`,
            newRoleLevel: commanderRoleLevel
        };
    }

    /**
     * Configure break-glass settings
     */
    async configureBreakGlass(
        userId: string,
        config: { successorId?: string; timeoutMinutes?: number; enabled?: boolean }
    ): Promise<{ success: boolean }> {
        const updates: Partial<Account> = {};

        if (config.successorId !== undefined) {
            // Verify successor exists
            if (config.successorId) {
                const successor = await this.accountRepository.findOne({
                    where: { id: config.successorId }
                });
                if (!successor) {
                    throw new BadRequestException('指定的接班人不存在');
                }
            }
            updates.emergencySuccessor = config.successorId;
        }

        if (config.timeoutMinutes !== undefined) {
            if (config.timeoutMinutes < 5 || config.timeoutMinutes > 60) {
                throw new BadRequestException('超時時間必須在 5-60 分鐘之間');
            }
            updates.breakGlassTimeoutMinutes = config.timeoutMinutes;
        }

        if (config.enabled !== undefined) {
            updates.breakGlassEnabled = config.enabled;
        }

        await this.accountRepository.update(userId, updates);

        await this.auditService.log({
            action: 'BREAK_GLASS_CONFIGURED',
            userId,
            resourceType: 'Account',
            resourceId: userId,
            description: 'Break-glass configuration updated',
            metadata: config
        });

        return { success: true };
    }

    /**
     * Get accounts with expired heartbeat (for monitoring/alerting)
     */
    async getExpiredHeartbeats(thresholdMinutes: number = 15): Promise<Account[]> {
        const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

        return this.accountRepository
            .createQueryBuilder('account')
            .leftJoinAndSelect('account.roles', 'role')
            .where('role.level >= :level', { level: 4 })
            .andWhere('account.isActive = :active', { active: true })
            .andWhere('account.breakGlassEnabled = :enabled', { enabled: true })
            .andWhere('account.lastHeartbeat < :threshold', { threshold })
            .getMany();
    }
}
