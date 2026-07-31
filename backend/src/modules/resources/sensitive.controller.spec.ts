import { Test, TestingModule } from '@nestjs/testing';
import { SensitiveController } from './sensitive.controller';
import { SensitiveService } from './sensitive.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('SensitiveController', () => {
    let controller: SensitiveController;

    beforeEach(async () => {
        const service = {
            readSensitiveData: jest.fn().mockResolvedValue({ data: {} }),
            queryAuditLogs: jest.fn().mockResolvedValue([]),
            getReadLogsByTarget: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SensitiveController],
            providers: [{ provide: SensitiveService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<SensitiveController>(SensitiveController);
    });

    const req = { user: { uid: 'u1', role: 'admin', roleLevel: 5 }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('readSensitiveData reads data', async () => {
        const result = await controller.readSensitiveData(
            { targetType: 'resource' as any, targetId: 't1', fieldsAccessed: ['name'], uiContext: 'detail' },
            req,
        );
        expect(result).toBeDefined();
    });
    it('queryAuditLogs returns logs', async () => {
        const result = await controller.queryAuditLogs({}, req);
        expect(result).toBeDefined();
    });
    it('getReadLogsByTarget returns logs', async () => {
        const result = await controller.getReadLogsByTarget({ targetType: 'resource' as any, targetId: 't1' }, req);
        expect(result).toBeDefined();
    });
});
