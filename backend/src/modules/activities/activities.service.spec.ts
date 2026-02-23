import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { Activity, ActivityRegistration } from './activities.entity';

describe('ActivitiesService', () => {
    let service: ActivitiesService;
    let activityRepo: any;
    let registrationRepo: any;

    const mockActivity: Partial<Activity> = {
        id: 'act-1',
        title: '防災演練',
        status: 'open',
        maxParticipants: 30,
        currentParticipants: 5,
        waitlistLimit: 10,
        requireApproval: false,
        registrationDeadline: undefined,
    };

    const mockRegistration: Partial<ActivityRegistration> = {
        id: 'reg-1',
        activityId: 'act-1',
        userId: 'user-1',
        userName: '王小明',
        status: 'confirmed',
        activity: mockActivity as Activity,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivitiesService,
                {
                    provide: getRepositoryToken(Activity),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'act-1', currentParticipants: 0, ...dto })),
                        save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
                        findOne: jest.fn().mockResolvedValue(mockActivity),
                        find: jest.fn().mockResolvedValue([mockActivity]),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            take: jest.fn().mockReturnThis(),
                            skip: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([mockActivity]),
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(ActivityRegistration),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'reg-1', ...dto })),
                        save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
                        findOne: jest.fn().mockResolvedValue(null),
                        find: jest.fn().mockResolvedValue([mockRegistration]),
                        count: jest.fn().mockResolvedValue(0),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnThis(),
                            addSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            groupBy: jest.fn().mockReturnThis(),
                            getRawMany: jest.fn().mockResolvedValue([
                                { status: 'confirmed', count: '10' },
                                { status: 'pending', count: '2' },
                                { status: 'waitlist', count: '3' },
                            ]),
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<ActivitiesService>(ActivitiesService);
        activityRepo = module.get(getRepositoryToken(Activity));
        registrationRepo = module.get(getRepositoryToken(ActivityRegistration));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Activity CRUD =====
    describe('createActivity', () => {
        it('should create an activity', async () => {
            const dto = { title: '防災演練', startAt: new Date(), endAt: new Date(), organizerId: 'org-1' };
            const result = await service.createActivity(dto as any);
            expect(activityRepo.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('findActivity', () => {
        it('should return activity by id', async () => {
            const result = await service.findActivity('act-1');
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException', async () => {
            activityRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findActivity('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findActivities', () => {
        it('should return filtered activities', async () => {
            const result = await service.findActivities({ category: 'training' });
            expect(result).toBeDefined();
        });
    });

    describe('updateActivity', () => {
        it('should update activity', async () => {
            const result = await service.updateActivity('act-1', { title: '更新標題' } as any);
            expect(activityRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    // ===== Lifecycle =====
    describe('publishActivity', () => {
        it('should set status to open', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity, status: 'draft' });
            const result = await service.publishActivity('act-1');
            expect(result.status).toBe('open');
        });
    });

    describe('closeRegistration', () => {
        it('should set status to closed', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity });
            const result = await service.closeRegistration('act-1');
            expect(result.status).toBe('closed');
        });
    });

    describe('cancelActivity', () => {
        it('should set status to cancelled', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity });
            const result = await service.cancelActivity('act-1');
            expect(result.status).toBe('cancelled');
        });
    });

    describe('completeActivity', () => {
        it('should set status to completed', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity });
            const result = await service.completeActivity('act-1');
            expect(result.status).toBe('completed');
        });
    });

    // ===== Registration =====
    describe('register', () => {
        it('should register user and confirm directly (no approval)', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity, status: 'open' });
            const dto = { activityId: 'act-1', userId: 'user-1', userName: '王小明' };
            const result = await service.register(dto as any);
            expect(result.status).toBe('confirmed');
        });

        it('should put on waitlist when full', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity, currentParticipants: 30 });
            // registrationRepo.findOne already returns null (no dupe)
            const dto = { activityId: 'act-1', userId: 'user-2', userName: '李大華' };
            const result = await service.register(dto as any);
            expect(result.status).toBe('waitlist');
        });

        it('should throw if activity not open', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity, status: 'closed' });
            await expect(service.register({ activityId: 'act-1', userId: 'u', userName: 'n' } as any))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw ConflictException if already registered', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity, status: 'open' });
            registrationRepo.findOne.mockResolvedValueOnce(mockRegistration);
            await expect(service.register({ activityId: 'act-1', userId: 'user-1', userName: '王小明' } as any))
                .rejects.toThrow(ConflictException);
        });

        it('should set to pending when approval required', async () => {
            activityRepo.findOne.mockResolvedValueOnce({ ...mockActivity, requireApproval: true });
            // registrationRepo.findOne returns null (no dupe)
            const result = await service.register({ activityId: 'act-1', userId: 'u', userName: 'n' } as any);
            expect(result.status).toBe('pending');
        });
    });

    describe('approveRegistration', () => {
        it('should approve pending registration', async () => {
            registrationRepo.findOne.mockResolvedValueOnce({
                ...mockRegistration, status: 'pending',
                activity: { ...mockActivity, currentParticipants: 5 },
            });
            const result = await service.approveRegistration('reg-1', 'admin-1');
            expect(result.status).toBe('confirmed');
        });

        it('should throw if not pending', async () => {
            registrationRepo.findOne.mockResolvedValueOnce({ ...mockRegistration, status: 'confirmed' });
            await expect(service.approveRegistration('reg-1', 'admin-1'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException', async () => {
            registrationRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.approveRegistration('nonexistent', 'admin'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('cancelRegistration', () => {
        it('should cancel registration and decrement count', async () => {
            registrationRepo.findOne.mockResolvedValueOnce({
                ...mockRegistration, status: 'confirmed',
                activity: { ...mockActivity, currentParticipants: 5 },
            });
            // Mock promoteFromWaitlist dependencies
            registrationRepo.findOne
                .mockResolvedValueOnce(null); // no waitlist to promote
            await service.cancelRegistration('reg-1', 'user-1');
            expect(registrationRepo.save).toHaveBeenCalled();
        });

        it('should throw if wrong user', async () => {
            registrationRepo.findOne.mockResolvedValueOnce({ ...mockRegistration, userId: 'other-user' });
            await expect(service.cancelRegistration('reg-1', 'user-1'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('getRegistrations', () => {
        it('should return registrations for activity', async () => {
            const result = await service.getRegistrations('act-1');
            expect(result).toEqual([mockRegistration]);
        });
    });

    describe('getUserRegistrations', () => {
        it('should return registrations for user', async () => {
            const result = await service.getUserRegistrations('user-1');
            expect(result).toBeDefined();
        });
    });

    describe('markAttendance', () => {
        it('should mark attendance', async () => {
            registrationRepo.findOne.mockResolvedValueOnce({ ...mockRegistration, status: 'confirmed' });
            const result = await service.markAttendance('reg-1', true);
            expect(result.status).toBe('attended');
        });
    });

    // ===== Stats =====
    describe('getActivityStats', () => {
        it('should return registration stats', async () => {
            const result = await service.getActivityStats('act-1');
            expect(result).toHaveProperty('confirmed');
            expect(result).toHaveProperty('pending');
            expect(result).toHaveProperty('waitlist');
            expect(result.confirmed).toBe(10);
            expect(result.pending).toBe(2);
        });
    });
});
