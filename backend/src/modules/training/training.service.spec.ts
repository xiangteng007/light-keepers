import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingCourse } from './training-courses.entity';
import { VolunteerTraining } from './volunteer-training.entity';

describe('TrainingService', () => {
    let service: TrainingService;
    let coursesRepo: any;
    let trainingRepo: any;

    const mockCourse: Partial<TrainingCourse> = {
        id: 'course-1',
        title: '基礎急救',
        description: '急救基礎知識',
        category: 'first_aid' as any,
        level: 'basic' as any,
        durationMinutes: 120,
        isActive: true,
        isRequired: true,
        sortOrder: 1,
    };

    const mockTraining: Partial<VolunteerTraining> = {
        id: 'training-1',
        volunteerId: 'vol-1',
        courseId: 'course-1',
        status: 'not_started' as any,
        progress: 0,
        course: mockCourse as TrainingCourse,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TrainingService,
                {
                    provide: getRepositoryToken(TrainingCourse),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockCourse),
                        save: jest.fn().mockResolvedValue(mockCourse),
                        find: jest.fn().mockResolvedValue([mockCourse]),
                        findOne: jest.fn().mockResolvedValue(mockCourse),
                    },
                },
                {
                    provide: getRepositoryToken(VolunteerTraining),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockTraining),
                        save: jest.fn().mockResolvedValue(mockTraining),
                        find: jest.fn().mockResolvedValue([mockTraining]),
                        findOne: jest.fn().mockResolvedValue(mockTraining),
                    },
                },
            ],
        }).compile();

        service = module.get<TrainingService>(TrainingService);
        coursesRepo = module.get(getRepositoryToken(TrainingCourse));
        trainingRepo = module.get(getRepositoryToken(VolunteerTraining));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Course Management =====
    describe('createCourse', () => {
        it('should create a course', async () => {
            const dto = { title: '基礎急救', description: '急救', category: 'first_aid', durationMinutes: 120, content: '...' };
            const result = await service.createCourse(dto as any);
            expect(coursesRepo.create).toHaveBeenCalled();
            expect(coursesRepo.save).toHaveBeenCalled();
            expect(result).toEqual(mockCourse);
        });
    });

    describe('getAllCourses', () => {
        it('should return all active courses', async () => {
            const result = await service.getAllCourses();
            expect(result).toEqual([mockCourse]);
            expect(coursesRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { isActive: true },
                }),
            );
        });
    });

    describe('getCourseById', () => {
        it('should return a course by id', async () => {
            const result = await service.getCourseById('course-1');
            expect(result).toEqual(mockCourse);
        });

        it('should throw NotFoundException', async () => {
            coursesRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.getCourseById('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getRequiredCourses', () => {
        it('should return required courses', async () => {
            const result = await service.getRequiredCourses();
            expect(result).toEqual([mockCourse]);
            expect(coursesRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { isRequired: true, isActive: true },
                }),
            );
        });
    });

    // ===== Training Progress =====
    describe('enrollVolunteer', () => {
        it('should enroll a volunteer in a course', async () => {
            trainingRepo.findOne.mockResolvedValueOnce(null); // not enrolled yet
            const result = await service.enrollVolunteer('vol-1', 'course-1');
            expect(trainingRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    volunteerId: 'vol-1',
                    courseId: 'course-1',
                    status: 'not_started',
                }),
            );
            expect(result).toBeDefined();
        });

        it('should return existing enrollment', async () => {
            const result = await service.enrollVolunteer('vol-1', 'course-1');
            expect(result).toEqual(mockTraining);
            expect(trainingRepo.create).not.toHaveBeenCalled();
        });
    });

    describe('startCourse', () => {
        it('should start a course', async () => {
            const result = await service.startCourse('vol-1', 'course-1');
            expect(trainingRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'in_progress' }),
            );
            expect(result).toBeDefined();
        });

        it('should auto-enroll if not enrolled', async () => {
            trainingRepo.findOne
                .mockResolvedValueOnce(null)  // startCourse lookup
                .mockResolvedValueOnce(null); // enrollVolunteer lookup
            const result = await service.startCourse('vol-1', 'course-2');
            expect(trainingRepo.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('updateProgress', () => {
        it('should update progress', async () => {
            const result = await service.updateProgress('vol-1', 'course-1', 50);
            expect(trainingRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ progress: 50 }),
            );
            expect(result).toBeDefined();
        });

        it('should complete course at 100%', async () => {
            const result = await service.updateProgress('vol-1', 'course-1', 100);
            expect(trainingRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'completed', progress: 100 }),
            );
            expect(result).toBeDefined();
        });

        it('should clamp progress to 0-100', async () => {
            await service.updateProgress('vol-1', 'course-1', 150);
            expect(trainingRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ progress: 100 }),
            );
        });

        it('should throw NotFoundException if not enrolled', async () => {
            trainingRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.updateProgress('vol-1', 'nonexistent', 50)).rejects.toThrow(NotFoundException);
        });
    });

    // ===== Stats =====
    describe('getVolunteerTraining', () => {
        it('should return trainings for a volunteer', async () => {
            const result = await service.getVolunteerTraining('vol-1');
            expect(result).toEqual([mockTraining]);
        });
    });

    describe('getVolunteerStats', () => {
        it('should return volunteer training stats', async () => {
            const completedTraining = { ...mockTraining, status: 'completed', course: { ...mockCourse, isRequired: true } };
            trainingRepo.find.mockResolvedValueOnce([completedTraining]);
            coursesRepo.find.mockResolvedValueOnce([mockCourse]); // required courses

            const result = await service.getVolunteerStats('vol-1');
            expect(result).toHaveProperty('totalCourses');
            expect(result).toHaveProperty('completed');
            expect(result).toHaveProperty('inProgress');
            expect(result).toHaveProperty('requiredCompleted');
            expect(result).toHaveProperty('requiredTotal');
        });
    });

    describe('getCourseStats', () => {
        it('should return overall course stats', async () => {
            const result = await service.getCourseStats();
            expect(result).toHaveProperty('totalCourses');
            expect(result).toHaveProperty('totalEnrollments');
            expect(result).toHaveProperty('totalCompletions');
        });
    });
});
