import { Test, TestingModule } from '@nestjs/testing';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './services/data-export.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('DataExportController', () => {
    let controller: DataExportController;
    let service: jest.Mocked<Partial<DataExportService>>;

    const mockExportRequest = {
        id: 'exp1',
        status: 'pending',
        format: 'json',
        createdAt: new Date(),
        completedAt: null,
        downloadUrl: null,
        expiresAt: null,
        error: null,
    };

    beforeEach(async () => {
        service = {
            requestExport: jest.fn().mockResolvedValue(mockExportRequest),
            getExportStatus: jest.fn().mockResolvedValue(mockExportRequest),
            getDownloadPath: jest.fn().mockResolvedValue('/tmp/export.json'),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DataExportController],
            providers: [{ provide: DataExportService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<DataExportController>(DataExportController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('requestExport creates export request', async () => {
        const req = { user: { id: 'u1' } } as any;
        const result = await controller.requestExport(req, 'json');
        expect(result.success).toBe(true);
        expect(result.data.requestId).toBe('exp1');
    });

    it('getStatus returns export status', async () => {
        const req = { user: { id: 'u1' } } as any;
        const result = await controller.getStatus(req, 'exp1');
        expect(result.success).toBe(true);
        expect(result.data.status).toBe('pending');
    });
});
