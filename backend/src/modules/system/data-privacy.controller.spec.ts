import { Test, TestingModule } from '@nestjs/testing';
import { DataPrivacyController } from './data-privacy.controller';
import { DataPrivacyService } from './data-privacy.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('DataPrivacyController', () => {
    let controller: DataPrivacyController;

    beforeEach(async () => {
        const service = {
            createDeletionRequest: jest.fn().mockResolvedValue({ id: 'r1', requestType: 'export', status: 'pending', requestedAt: new Date() }),
            getDeletionRequests: jest.fn().mockReturnValue([]),
            processDeletionRequest: jest.fn().mockResolvedValue({ id: 'r1', requestType: 'deletion', status: 'completed', processedAt: new Date(), processedBy: 'admin' }),
            anonymizeUserData: jest.fn().mockResolvedValue(undefined),
            deleteUserData: jest.fn().mockResolvedValue(undefined),
            getConfig: jest.fn().mockReturnValue({ dataRetentionDays: 365 }),
            updateConfig: jest.fn().mockReturnValue({ dataRetentionDays: 180 }),
            processDataRetention: jest.fn().mockResolvedValue({ deleted: 5, anonymized: 3 }),
            exportUserData: jest.fn().mockResolvedValue({ profile: {} }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DataPrivacyController],
            providers: [{ provide: DataPrivacyService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<DataPrivacyController>(DataPrivacyController);
    });

    const req = { user: { id: 'u1', sub: 'u1', email: 'a@b.com' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('createDSAR', async () => expect((await controller.createDSAR(req, { requestType: 'export' })).success).toBe(true));
    it('listDSARRequests', async () => expect((await controller.listDSARRequests()).success).toBe(true));
    it('processDSAR', async () => expect((await controller.processDSAR('r1', req)).success).toBe(true));
    it('anonymizeUser', async () => expect((await controller.anonymizeUser('u1')).success).toBe(true));
    it('deleteUserData', async () => expect((await controller.deleteUserData('u1')).success).toBe(true));
    it('getConfig', async () => expect((await controller.getConfig()).success).toBe(true));
    it('updateConfig', async () => expect((await controller.updateConfig({ dataRetentionDays: 180 })).success).toBe(true));
    it('processRetention', async () => expect((await controller.processRetention()).success).toBe(true));
    it('exportMyData', async () => expect((await controller.exportMyData(req)).success).toBe(true));
});
