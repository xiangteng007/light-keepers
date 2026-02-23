import { Test, TestingModule } from '@nestjs/testing';
import { AiJobsController } from './ai-jobs.controller';
import { AiJobsService } from './ai-jobs.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AiJobsController', () => {
    let controller: AiJobsController;
    let service: jest.Mocked<Partial<AiJobsService>>;

    const mockJob = { id: 'j1', status: 'queued', useCase: 'summarize' };
    const mockUser = { id: 'u1', displayName: 'Test', roles: [{ name: 'volunteer', level: 1 }] };

    beforeEach(async () => {
        service = {
            create: jest.fn().mockResolvedValue({ jobId: 'j1', status: 'queued', estimatedWaitMs: 5000 }),
            findById: jest.fn().mockResolvedValue(mockJob),
            cancel: jest.fn().mockResolvedValue(undefined),
            findByMission: jest.fn().mockResolvedValue([mockJob]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AiJobsController],
            providers: [{ provide: AiJobsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AiJobsController>(AiJobsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('createJob creates a new AI job', async () => {
        const result = await controller.createJob({ useCase: 'summarize', input: { text: 'hello' } } as any, mockUser as any);
        expect(result.jobId).toBe('j1');
        expect(service.create).toHaveBeenCalled();
    });

    it('getJob returns job details', async () => {
        const result = await controller.getJob('j1');
        expect(result).toEqual(mockJob);
    });

    it('cancelJob cancels a job', async () => {
        const result = await controller.cancelJob('j1', mockUser as any);
        expect(result.success).toBe(true);
    });

    it('listJobs lists jobs for a mission', async () => {
        const result = await controller.listJobs('m1');
        expect(result).toHaveLength(1);
    });
});
