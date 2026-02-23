import { Test, TestingModule } from '@nestjs/testing';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TrainingController', () => {
    let controller: TrainingController;

    beforeEach(async () => {
        const service = {
            createCourse: jest.fn().mockResolvedValue({ id: 'c1' }),
            getAllCourses: jest.fn().mockResolvedValue([]),
            getRequiredCourses: jest.fn().mockResolvedValue([]),
            getCourseById: jest.fn().mockResolvedValue({ id: 'c1' }),
            enrollVolunteer: jest.fn().mockResolvedValue({ id: 'e1' }),
            startCourse: jest.fn().mockResolvedValue({ id: 'e1' }),
            updateProgress: jest.fn().mockResolvedValue({ id: 'e1', status: 'in_progress' }),
            getVolunteerTraining: jest.fn().mockResolvedValue([]),
            getVolunteerStats: jest.fn().mockResolvedValue({}),
            getCourseStats: jest.fn().mockResolvedValue({}),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TrainingController],
            providers: [{ provide: TrainingService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<TrainingController>(TrainingController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('createCourse', async () => expect((await controller.createCourse({} as any)).success).toBe(true));
    it('getAllCourses', async () => expect((await controller.getAllCourses()).success).toBe(true));
    it('getRequiredCourses', async () => expect((await controller.getRequiredCourses()).success).toBe(true));
    it('getCourseById', async () => expect((await controller.getCourseById('c1')).success).toBe(true));
    it('enrollVolunteer', async () => expect((await controller.enrollVolunteer('v1', 'c1')).success).toBe(true));
    it('startCourse', async () => expect((await controller.startCourse('v1', 'c1')).success).toBe(true));
    it('updateProgress', async () => expect((await controller.updateProgress('v1', 'c1', 50)).success).toBe(true));
    it('getVolunteerTraining', async () => expect((await controller.getVolunteerTraining('v1')).success).toBe(true));
    it('getVolunteerStats', async () => expect((await controller.getVolunteerStats('v1')).success).toBe(true));
    it('getCourseStats', async () => expect((await controller.getCourseStats()).success).toBe(true));
});
