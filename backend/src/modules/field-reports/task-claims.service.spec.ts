import { TaskClaimsService } from './task-claims.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('TaskClaimsService', () => {
    let service: TaskClaimsService;
    let claimRepo: Record<string, jest.Mock>;
    let progressRepo: Record<string, jest.Mock>;
    let auditService: Record<string, jest.Mock>;
    let gateway: Record<string, jest.Mock>;
    const mockUser = { uid: 'u1', displayName: 'Alice' };
    const mockClaim = { id: 'cl1', taskId: 't1', claimedBy: 'u1', releasedAt: null, createdAt: new Date() };

    beforeEach(() => {
        claimRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(d => ({ id: 'cl1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
        };
        progressRepo = {
            create: jest.fn().mockImplementation(d => ({ id: 'pg1', createdAt: new Date(), ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([]),
        };
        auditService = { log: jest.fn().mockResolvedValue(undefined) };
        gateway = {
            emitTaskClaimed: jest.fn(),
            broadcastToSession: jest.fn(),
            emitTaskProgress: jest.fn(),
        };
        service = new TaskClaimsService(claimRepo as any, progressRepo as any, auditService as any, gateway as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('claim', () => {
        it('should claim an unclaimed task', async () => {
            const result = await service.claim('t1', 'ms1', mockUser);
            expect(claimRepo.save).toHaveBeenCalled();
            expect(auditService.log).toHaveBeenCalled();
            expect(gateway.emitTaskClaimed).toHaveBeenCalled();
        });

        it('should throw if task already claimed', async () => {
            claimRepo.findOne.mockResolvedValueOnce(mockClaim);
            await expect(service.claim('t1', 'ms1', mockUser)).rejects.toThrow(ConflictException);
        });
    });

    describe('release', () => {
        it('should release a claimed task', async () => {
            claimRepo.findOne.mockResolvedValueOnce({ ...mockClaim });
            await service.release('t1', 'ms1', '任務完成', mockUser);
            expect(claimRepo.save).toHaveBeenCalled();
            expect(gateway.broadcastToSession).toHaveBeenCalled();
        });

        it('should throw if no claim found', async () => {
            await expect(service.release('t1', 'ms1', 'reason', mockUser)).rejects.toThrow(NotFoundException);
        });
    });

    describe('addProgress', () => {
        it('should add progress to claimed task', async () => {
            claimRepo.findOne.mockResolvedValueOnce(mockClaim);
            const result = await service.addProgress('t1', 'ms1', { note: '進行中', percent: 50 }, mockUser);
            expect(progressRepo.save).toHaveBeenCalled();
            expect(gateway.emitTaskProgress).toHaveBeenCalled();
        });

        it('should throw if task not claimed by user', async () => {
            await expect(service.addProgress('t1', 'ms1', {}, mockUser)).rejects.toThrow(ConflictException);
        });
    });

    describe('getProgress', () => {
        it('should return progress updates', async () => {
            const result = await service.getProgress('t1');
            expect(progressRepo.find).toHaveBeenCalled();
        });
    });

    describe('getCurrentClaim', () => {
        it('should return current claim', async () => {
            claimRepo.findOne.mockResolvedValueOnce(mockClaim);
            const result = await service.getCurrentClaim('t1');
            expect(result?.taskId).toBe('t1');
        });
    });
});
