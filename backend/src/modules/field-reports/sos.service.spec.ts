import { SosService } from './sos.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('SosService', () => {
    let service: SosService;
    let sosRepo: Record<string, jest.Mock>;
    let reportRepo: Record<string, jest.Mock>;
    let auditService: Record<string, jest.Mock>;
    const mockUser = { uid: 'u1', displayName: 'Alice' };
    const mockSos = {
        id: 'sos1', missionSessionId: 'ms1', userId: 'u1',
        status: 'active', createdAt: new Date(),
    };

    beforeEach(() => {
        const qb = {
            insert: jest.fn().mockReturnThis(),
            into: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            execute: jest.fn(),
        };
        reportRepo = {
            createQueryBuilder: jest.fn().mockReturnValue({
                ...qb,
                execute: jest.fn().mockResolvedValue({ generatedMaps: [{ id: 'fr1' }] }),
            }),
        };
        sosRepo = {
            createQueryBuilder: jest.fn().mockReturnValue({
                ...qb,
                execute: jest.fn().mockResolvedValue({ generatedMaps: [{ id: 'sos1', status: 'active' }] }),
            }),
            findOne: jest.fn().mockResolvedValue({ ...mockSos }),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockSos]),
        };
        auditService = { log: jest.fn().mockResolvedValue(undefined) };
        service = new SosService(sosRepo as any, reportRepo as any, auditService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('trigger', () => {
        it('should create SOS signal with auto-report', async () => {
            const result = await service.trigger('ms1', {
                latitude: 25.03, longitude: 121.56, message: '需要救援',
            } as any, mockUser);
            expect(result.sosId).toBe('sos1');
            expect(result.reportId).toBe('fr1');
            expect(auditService.log).toHaveBeenCalled();
        });
    });

    describe('ack', () => {
        it('should acknowledge active SOS', async () => {
            const result = await service.ack('sos1', {} as any, mockUser);
            expect(result.status).toBe('acked');
            expect(result.ackedBy).toBe('u1');
        });

        it('should throw for non-active SOS', async () => {
            sosRepo.findOne.mockResolvedValueOnce({ ...mockSos, status: 'resolved' });
            await expect(service.ack('sos1', {} as any, mockUser)).rejects.toThrow(ConflictException);
        });

        it('should throw for missing SOS', async () => {
            sosRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.ack('bad', {} as any, mockUser)).rejects.toThrow(NotFoundException);
        });
    });

    describe('resolve', () => {
        it('should resolve SOS', async () => {
            const result = await service.resolve('sos1', { resolutionNote: '已救援' } as any, mockUser);
            expect(result.status).toBe('resolved');
            expect(result.resolvedBy).toBe('u1');
        });

        it('should throw for missing SOS', async () => {
            sosRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.resolve('bad', {} as any, mockUser)).rejects.toThrow(NotFoundException);
        });
    });

    describe('findActive', () => {
        it('should return active SOS signals', async () => {
            const result = await service.findActive('ms1');
            expect(result.length).toBe(1);
        });
    });
});
