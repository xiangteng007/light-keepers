import { Test, TestingModule } from '@nestjs/testing';
import { MissionReportController } from './mission-report.controller';
import { MissionReportService } from './mission-report.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('MissionReportController', () => {
    let controller: MissionReportController;

    beforeEach(async () => {
        const service = {
            generatePdfReport: jest.fn().mockResolvedValue({ success: true, base64: 'dGVzdA==', filename: 'report.pdf' }),
            generateCsvReport: jest.fn().mockResolvedValue({ success: true, base64: 'dGVzdA==', filename: 'report.csv' }),
            generateJsonPackage: jest.fn().mockResolvedValue({ success: true, base64: 'dGVzdA==', filename: 'report.json' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MissionReportController],
            providers: [{ provide: MissionReportService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<MissionReportController>(MissionReportController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('generatePdfReport generates PDF', async () => {
        const result = await controller.generatePdfReport('s1');
        expect(result.success).toBe(true);
    });

    it('generateCsvReport generates CSV', async () => {
        const result = await controller.generateCsvReport('s1');
        expect(result.success).toBe(true);
    });

    it('generateJsonPackage generates JSON', async () => {
        const result = await controller.generateJsonPackage('s1');
        expect(result.success).toBe(true);
    });

    it('downloadPdf sends PDF buffer', async () => {
        const res = { setHeader: jest.fn(), send: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
        await controller.downloadPdf('s1', res);
        expect(res.send).toHaveBeenCalled();
    });
});
