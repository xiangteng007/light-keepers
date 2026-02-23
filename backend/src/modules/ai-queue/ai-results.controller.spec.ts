import { Test, TestingModule } from '@nestjs/testing';
import { AiResultsController } from './ai-results.controller';
import { AiResultsService } from './ai-results.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AiResultsController', () => {
    let controller: AiResultsController;
    let service: jest.Mocked<Partial<AiResultsService>>;

    const mockUser = { uid: 'u1', id: 'u1', roleLevel: 3, displayName: 'Officer' } as any;

    beforeEach(async () => {
        service = {
            accept: jest.fn().mockResolvedValue({ success: true, appliedAction: 'update_triage' }),
            reject: jest.fn().mockResolvedValue({ success: true, reason: 'inaccurate' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AiResultsController],
            providers: [{ provide: AiResultsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AiResultsController>(AiResultsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('acceptResult accepts AI result', async () => {
        const result = await controller.acceptResult('j1', {} as any, mockUser);
        expect(result.success).toBe(true);
        expect(service.accept).toHaveBeenCalled();
    });

    it('rejectResult rejects AI result', async () => {
        const result = await controller.rejectResult('j1', { reason: 'inaccurate' } as any, mockUser);
        expect(result.success).toBe(true);
        expect(service.reject).toHaveBeenCalled();
    });
});
