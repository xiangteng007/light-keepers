import { MobilizationService } from './mobilization.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MobilizationService', () => {
    let service: MobilizationService;
    let mobilizationRepo: Record<string, jest.Mock>;
    let responseRepo: Record<string, jest.Mock>;

    const mockMob = {
        id: 'm1', title: '颱風動員', status: 'DRAFT',
        requiredCount: 10, confirmedCount: 0, checkedInCount: 0,
        responses: [],
    };

    beforeEach(() => {
        mobilizationRepo = {
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockMob]),
            findOne: jest.fn().mockResolvedValue(mockMob),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        responseRepo = {
            create: jest.fn().mockImplementation(d => ({ id: 'r1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            count: jest.fn().mockResolvedValue(0),
        };
        service = new MobilizationService(mobilizationRepo as any, responseRepo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('create', () => {
        it('should create mobilization', async () => {
            const result = await service.create({ title: '水災動員', requiredCount: 5 } as any, 'user-1');
            expect(mobilizationRepo.save).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return all mobilizations', async () => {
            const result = await service.findAll();
            expect(result.length).toBe(1);
        });
    });

    describe('findById', () => {
        it('should return mobilization', async () => {
            const result = await service.findById('m1');
            expect(result.id).toBe('m1');
        });

        it('should throw for not found', async () => {
            mobilizationRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
        });
    });

    describe('activate', () => {
        it('should activate draft mobilization', async () => {
            const result = await service.activate('m1');
            expect(mobilizationRepo.save).toHaveBeenCalled();
        });

        it('should throw if not draft', async () => {
            mobilizationRepo.findOne.mockResolvedValueOnce({ ...mockMob, status: 'ACTIVE' });
            await expect(service.activate('m1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('complete', () => {
        it('should complete mobilization', async () => {
            const result = await service.complete('m1');
            expect(mobilizationRepo.save).toHaveBeenCalled();
        });
    });

    describe('cancel', () => {
        it('should cancel mobilization', async () => {
            const result = await service.cancel('m1');
            expect(mobilizationRepo.save).toHaveBeenCalled();
        });
    });

    describe('respond', () => {
        it('should create response for active mobilization', async () => {
            mobilizationRepo.findOne.mockResolvedValueOnce({ ...mockMob, status: 'ACTIVE' });
            const result = await service.respond('m1', 'v1', { status: 'CONFIRMED' } as any);
            expect(responseRepo.save).toHaveBeenCalled();
        });

        it('should throw if not active', async () => {
            mobilizationRepo.findOne.mockResolvedValueOnce({ ...mockMob, status: 'DRAFT' });
            await expect(service.respond('m1', 'v1', { status: 'CONFIRMED' } as any))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('checkin', () => {
        it('should checkin confirmed volunteer', async () => {
            responseRepo.findOne.mockResolvedValueOnce({ id: 'r1', status: 'CONFIRMED', mobilizationId: 'm1', volunteerId: 'v1' });
            const result = await service.checkin('m1', 'v1', { latitude: 25.03, longitude: 121.56 });
            expect(responseRepo.save).toHaveBeenCalled();
        });

        it('should throw for non-confirmed response', async () => {
            responseRepo.findOne.mockResolvedValueOnce({ status: 'DECLINED' });
            await expect(service.checkin('m1', 'v1', {})).rejects.toThrow(BadRequestException);
        });
    });

    describe('getStats', () => {
        it('should return stats', async () => {
            const stats = await service.getStats();
            expect(stats.total).toBeDefined();
            expect(stats.overallFulfillmentRate).toBeDefined();
        });
    });
});
