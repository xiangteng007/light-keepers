import { AssignmentsService } from './assignments.service';
import { NotFoundException } from '@nestjs/common';

describe('AssignmentsService', () => {
    let service: AssignmentsService;
    let assignRepo: Record<string, jest.Mock>;
    let volService: Record<string, jest.Mock>;
    let lineService: Record<string, jest.Mock>;
    const mockAssignment = {
        id: 'a1', volunteerId: 'v1', taskTitle: 'Test Task',
        status: 'assigned', scheduledStart: new Date(),
    };

    beforeEach(() => {
        assignRepo = {
            create: jest.fn().mockImplementation(d => ({ id: 'a1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockAssignment]),
            findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...mockAssignment })),
            count: jest.fn().mockResolvedValue(0),
        };
        volService = {
            findOne: jest.fn().mockResolvedValue({
                id: 'v1', name: 'Test', lineUserId: 'line-1',
            }),
            updateStatus: jest.fn().mockResolvedValue(undefined),
        };
        lineService = {
            isEnabled: jest.fn().mockReturnValue(false),
            pushText: jest.fn().mockResolvedValue(undefined),
            sendTaskAssignment: jest.fn().mockResolvedValue(undefined),
        };
        service = new AssignmentsService(assignRepo as any, volService as any, lineService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('create', () => {
        it('should create assignment', async () => {
            const result = await service.create({
                volunteerId: 'v1', taskTitle: 'Test', scheduledStart: new Date(),
            });
            expect(assignRepo.create).toHaveBeenCalled();
        });
    });

    describe('findByVolunteer', () => {
        it('should return volunteer assignments', async () => {
            const result = await service.findByVolunteer('v1');
            expect(result.length).toBe(1);
        });
    });

    describe('findOne', () => {
        it('should return assignment', async () => {
            const result = await service.findOne('a1');
            expect(result.id).toBe('a1');
        });

        it('should throw for not found', async () => {
            assignRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
        });
    });

    describe('accept', () => {
        it('should accept assignment', async () => {
            const result = await service.accept('a1');
            expect(assignRepo.save).toHaveBeenCalled();
        });
    });

    describe('decline', () => {
        it('should decline with reason', async () => {
            const result = await service.decline('a1', 'Busy');
            expect(assignRepo.save).toHaveBeenCalled();
        });
    });

    describe('checkIn', () => {
        it('should check in', async () => {
            assignRepo.findOne.mockResolvedValueOnce({ ...mockAssignment, status: 'accepted' });
            const result = await service.checkIn('a1', { latitude: 25.03, longitude: 121.56 });
            expect(assignRepo.save).toHaveBeenCalled();
        });
    });

    describe('cancel', () => {
        it('should cancel assignment', async () => {
            const result = await service.cancel('a1');
            expect(assignRepo.save).toHaveBeenCalled();
        });
    });

    describe('findPending', () => {
        it('should return pending assignments', async () => {
            const result = await service.findPending();
            expect(assignRepo.find).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should return stats', async () => {
            assignRepo.count.mockResolvedValue(5);
            const stats = await service.getStats();
            expect(stats.total).toBeDefined();
        });
    });
});
