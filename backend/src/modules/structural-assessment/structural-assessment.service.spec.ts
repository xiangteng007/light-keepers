import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StructuralAssessmentService } from './structural-assessment.service';
import { StructuralAssessment, SafetyLevel } from './entities/structural-assessment.entity';

describe('StructuralAssessmentService', () => {
    let service: StructuralAssessmentService;
    let repo: Record<string, jest.Mock>;

    const mockAssessment = {
        id: 'sa-1',
        missionSessionId: 'mission-1',
        safetyLevel: SafetyLevel.YELLOW,
        estimatedTrapped: 5,
        confirmedTrapped: 3,
        rescued: 2,
        assessedAt: new Date(),
    };

    beforeEach(async () => {
        repo = {
            save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'sa-1', ...e })),
            find: jest.fn().mockResolvedValue([mockAssessment]),
            findOne: jest.fn().mockResolvedValue(mockAssessment),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StructuralAssessmentService,
                { provide: getRepositoryToken(StructuralAssessment), useValue: repo },
            ],
        }).compile();

        service = module.get<StructuralAssessmentService>(StructuralAssessmentService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create assessment with stringified JSON fields', async () => {
            const dto = {
                safetyLevel: SafetyLevel.RED,
                accessPoints: ['front', 'side'],
                hazards: ['fire'],
                estimatedTrapped: 10,
            };
            const result = await service.create(dto as any, 'user-1');
            expect(repo.save).toHaveBeenCalled();
            expect(result.id).toBe('sa-1');
        });
    });

    describe('findAll', () => {
        it('should return all assessments', async () => {
            const results = await service.findAll();
            expect(repo.find).toHaveBeenCalledWith({ where: {}, order: { assessedAt: 'DESC' } });
            expect(results).toHaveLength(1);
        });

        it('should filter by missionSessionId', async () => {
            await service.findAll('mission-1');
            expect(repo.find).toHaveBeenCalledWith({
                where: { missionSessionId: 'mission-1' },
                order: { assessedAt: 'DESC' },
            });
        });
    });

    describe('findById', () => {
        it('should return assessment by id', async () => {
            const result = await service.findById('sa-1');
            expect(result.id).toBe('sa-1');
        });

        it('should throw NotFoundException if not found', async () => {
            repo.findOne.mockResolvedValue(null);
            await expect(service.findById('fake')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findBySafetyLevel', () => {
        it('should filter by safety level', async () => {
            await service.findBySafetyLevel(SafetyLevel.RED);
            expect(repo.find).toHaveBeenCalledWith({
                where: { safetyLevel: SafetyLevel.RED },
                order: { assessedAt: 'DESC' },
            });
        });
    });

    describe('update', () => {
        it('should update assessment', async () => {
            const result = await service.update('sa-1', { rescued: 5 } as any, 'user-1');
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('updateRescueCount', () => {
        it('should update rescued count', async () => {
            await service.updateRescueCount('sa-1', 10);
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('getStatistics', () => {
        it('should aggregate statistics', async () => {
            repo.find.mockResolvedValue([
                { safetyLevel: SafetyLevel.GREEN, estimatedTrapped: 0, confirmedTrapped: 0, rescued: 0 },
                { safetyLevel: SafetyLevel.RED, estimatedTrapped: 5, confirmedTrapped: 3, rescued: 2 },
                { safetyLevel: SafetyLevel.RED, estimatedTrapped: 8, confirmedTrapped: null, rescued: 1 },
            ]);
            const stats = await service.getStatistics();
            expect(stats.total).toBe(3);
            expect(stats.bySafetyLevel[SafetyLevel.RED]).toBe(2);
            expect(stats.bySafetyLevel[SafetyLevel.GREEN]).toBe(1);
            expect(stats.totalTrapped).toBe(11); // 0 + 3 + 8 (null confirmedTrapped falls back to estimatedTrapped)
            expect(stats.totalRescued).toBe(3);
        });
    });
});
