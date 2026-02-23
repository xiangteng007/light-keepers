import { DataPrivacyService } from './data-privacy.service';

describe('DataPrivacyService', () => {
    let service: DataPrivacyService;
    let dataSource: Record<string, jest.Mock>;

    beforeEach(() => {
        dataSource = {
            query: jest.fn().mockResolvedValue([]),
        };
        service = new DataPrivacyService(dataSource as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getConfig / updateConfig', () => {
        it('should return default privacy config', () => {
            const cfg = service.getConfig();
            expect(cfg.dataRetentionDays).toBe(365);
            expect(cfg.gdprEnabled).toBe(true);
        });

        it('should update config', () => {
            const cfg = service.updateConfig({ dataRetentionDays: 180 });
            expect(cfg.dataRetentionDays).toBe(180);
        });
    });

    describe('createDeletionRequest', () => {
        it('should create deletion request', async () => {
            const req = await service.createDeletionRequest({
                userId: 'u1', userEmail: 'a@b.com', requestType: 'deletion',
            });
            expect(req.id).toBeDefined();
            expect(req.status).toBe('pending');
        });

        it('should create export request', async () => {
            const req = await service.createDeletionRequest({
                userId: 'u2', userEmail: 'c@d.com', requestType: 'export',
            });
            expect(req.requestType).toBe('export');
        });
    });

    describe('getDeletionRequests', () => {
        it('should return all requests', async () => {
            await service.createDeletionRequest({ userId: 'u1', userEmail: 'a@b.com', requestType: 'deletion' });
            const reqs = service.getDeletionRequests();
            expect(reqs.length).toBeGreaterThanOrEqual(1);
        });

        it('should filter by status', async () => {
            await service.createDeletionRequest({ userId: 'u1', userEmail: 'a@b.com', requestType: 'deletion' });
            const pending = service.getDeletionRequests('pending');
            expect(pending.every(r => r.status === 'pending')).toBe(true);
        });
    });

    describe('processDeletionRequest', () => {
        it('should process a pending request', async () => {
            const req = await service.createDeletionRequest({
                userId: 'u1', userEmail: 'a@b.com', requestType: 'anonymize',
            });
            const processed = await service.processDeletionRequest(req.id, 'admin1');
            expect(processed.status).toBe('completed');
            expect(processed.processedBy).toBe('admin1');
        });
    });

    describe('exportUserData', () => {
        it('should export user data', async () => {
            const exportResult = await service.exportUserData('u1');
            expect(exportResult.userId).toBe('u1');
            expect(exportResult.data).toHaveProperty('profile');
        });
    });

    describe('processDataRetention', () => {
        it('should process retention cleanup', async () => {
            const result = await service.processDataRetention();
            expect(result).toHaveProperty('deleted');
            expect(result).toHaveProperty('anonymized');
        });
    });
});
