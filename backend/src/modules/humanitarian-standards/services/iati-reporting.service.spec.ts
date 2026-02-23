import { Test, TestingModule } from '@nestjs/testing';
import { IatiReportingService } from './iati-reporting.service';

describe('IatiReportingService', () => {
    let service: IatiReportingService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [IatiReportingService],
        }).compile();
        service = module.get(IatiReportingService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('generateIatiXml should produce XML string', async () => {
        const mission = { name: 'Test', status: 'active', startTime: '2024-01-01', location: { county: 'Taipei' } };
        const xml = await service.generateIatiXml(mission);
        expect(xml).toContain('iati-activity');
    });

    it('validateIatiCompliance flags missing fields', () => {
        const activity = { identifier: '', title: 'T', description: 'D', status: 'IMPLEMENTATION' as any, startDate: new Date(), sectors: [], locations: [], participatingOrgs: [], transactions: [] };
        const result = service.validateIatiCompliance(activity as any);
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('issues');
    });
});
