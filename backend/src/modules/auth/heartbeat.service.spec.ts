import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';
import { Account } from '../accounts/entities/account.entity';
import { AuditService } from '../audit/audit.service';

describe('HeartbeatService', () => {
    let service: HeartbeatService;
    let accountRepo: {
        update: jest.Mock;
        findOne: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let auditService: { log: jest.Mock };
    let queryBuilder: any;

    beforeEach(async () => {
        queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };

        accountRepo = {
            update: jest.fn().mockResolvedValue(undefined),
            findOne: jest.fn().mockResolvedValue(null),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };

        auditService = { log: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HeartbeatService,
                { provide: getRepositoryToken(Account), useValue: accountRepo },
                { provide: AuditService, useValue: auditService },
            ],
        }).compile();

        service = module.get<HeartbeatService>(HeartbeatService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== updateHeartbeat =====
    describe('updateHeartbeat', () => {
        it('should update heartbeat and return response', async () => {
            const result = await service.updateHeartbeat('user-1');
            expect(accountRepo.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ lastHeartbeat: expect.any(Date) }));
            expect(result.success).toBe(true);
            expect(result.nextHeartbeatSeconds).toBe(30);
            expect(result.timestamp).toBeDefined();
        });
    });

    // ===== getCommanderStatus =====
    describe('getCommanderStatus', () => {
        it('should return empty when no commanders', async () => {
            const result = await service.getCommanderStatus();
            expect(result).toEqual([]);
        });

        it('should mark online commanders correctly', async () => {
            queryBuilder.getMany.mockResolvedValueOnce([
                {
                    id: 'cmd-1',
                    displayName: '指揮官A',
                    email: 'a@test.com',
                    roles: [{ level: 5 }],
                    lastHeartbeat: new Date(), // just now → online
                    breakGlassEnabled: true,
                    emergencySuccessor: 'backup-1',
                },
                {
                    id: 'cmd-2',
                    displayName: null,
                    email: 'b@test.com',
                    roles: [{ level: 4 }],
                    lastHeartbeat: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago → offline
                    breakGlassEnabled: false,
                    emergencySuccessor: null,
                },
            ]);

            const result = await service.getCommanderStatus();
            expect(result).toHaveLength(2);
            expect(result[0].isOnline).toBe(true);
            expect(result[0].displayName).toBe('指揮官A');
            expect(result[1].isOnline).toBe(false);
            expect(result[1].displayName).toBe('b@test.com'); // fallback to email
        });
    });

    // ===== executeBreakGlass =====
    describe('executeBreakGlass', () => {
        it('should throw if target commander not found', async () => {
            await expect(
                service.executeBreakGlass('invoker-1', { targetCommanderId: 'unknown', reason: 'test' } as any)
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw if invoker is not the designated successor', async () => {
            accountRepo.findOne.mockResolvedValueOnce({
                id: 'cmd-1',
                emergencySuccessor: 'other-user',
                breakGlassEnabled: true,
                roles: [{ level: 5 }],
            });
            await expect(
                service.executeBreakGlass('wrong-invoker', { targetCommanderId: 'cmd-1', reason: 'test' } as any)
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw if break-glass not enabled', async () => {
            accountRepo.findOne.mockResolvedValueOnce({
                id: 'cmd-1',
                emergencySuccessor: 'invoker-1',
                breakGlassEnabled: false,
                roles: [{ level: 5 }],
            });
            await expect(
                service.executeBreakGlass('invoker-1', { targetCommanderId: 'cmd-1', reason: 'test' } as any)
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw if commander is still online (recent heartbeat)', async () => {
            accountRepo.findOne.mockResolvedValueOnce({
                id: 'cmd-1',
                emergencySuccessor: 'invoker-1',
                breakGlassEnabled: true,
                lastHeartbeat: new Date(), // just now
                breakGlassTimeoutMinutes: 15,
                roles: [{ level: 5 }],
            });
            await expect(
                service.executeBreakGlass('invoker-1', { targetCommanderId: 'cmd-1', reason: 'emergency' } as any)
            ).rejects.toThrow(BadRequestException);
        });

        it('should succeed when commander timed out', async () => {
            accountRepo.findOne
                .mockResolvedValueOnce({ // target commander
                    id: 'cmd-1',
                    emergencySuccessor: 'invoker-1',
                    breakGlassEnabled: true,
                    lastHeartbeat: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago
                    breakGlassTimeoutMinutes: 15,
                    roles: [{ level: 5, name: 'commander' }],
                })
                .mockResolvedValueOnce({ // invoker
                    id: 'invoker-1',
                    roles: [{ level: 2 }],
                });

            const result = await service.executeBreakGlass('invoker-1', {
                targetCommanderId: 'cmd-1',
                reason: '指揮官失聯',
            } as any);

            expect(result.success).toBe(true);
            expect(result.newRoleLevel).toBe(5);
            expect(auditService.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'BREAK_GLASS_EXECUTED' })
            );
        });
    });

    // ===== configureBreakGlass =====
    describe('configureBreakGlass', () => {
        it('should throw for invalid timeout', async () => {
            await expect(
                service.configureBreakGlass('user-1', { timeoutMinutes: 3 })
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw for nonexistent successor', async () => {
            accountRepo.findOne.mockResolvedValueOnce(null);
            await expect(
                service.configureBreakGlass('user-1', { successorId: 'nonexistent' })
            ).rejects.toThrow(BadRequestException);
        });

        it('should update configuration', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'backup-1' }); // successor exists
            const result = await service.configureBreakGlass('user-1', {
                successorId: 'backup-1',
                timeoutMinutes: 30,
                enabled: true,
            });
            expect(result.success).toBe(true);
            expect(accountRepo.update).toHaveBeenCalledWith('user-1', expect.objectContaining({
                emergencySuccessor: 'backup-1',
                breakGlassTimeoutMinutes: 30,
                breakGlassEnabled: true,
            }));
        });
    });

    // ===== getExpiredHeartbeats =====
    describe('getExpiredHeartbeats', () => {
        it('should query for commanders with expired heartbeat', async () => {
            await service.getExpiredHeartbeats(15);
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'account.lastHeartbeat < :threshold',
                expect.objectContaining({ threshold: expect.any(Date) })
            );
        });
    });
});
