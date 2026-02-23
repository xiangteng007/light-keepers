import { Test, TestingModule } from '@nestjs/testing';
import { OchaIntegrationService } from './ocha-integration.service';

describe('OchaIntegrationService', () => {
    let service: OchaIntegrationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OchaIntegrationService],
        }).compile();
        service = module.get(OchaIntegrationService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('add3WRecord returns record with id', () => {
        const record = service.add3WRecord({
            who: { organization: 'NGO', organizationType: 'NNGO', cluster: 'WASH' },
            what: { activity: 'Water', activityType: 'distribution', sector: 'WASH' },
            where: { country: 'Taiwan', admin1: 'Taipei' },
            when: { startDate: new Date(), reportingPeriod: 'monthly' },
            status: 'ongoing',
        });
        expect(record.id).toBeDefined();
    });

    it('getAll3WRecords returns added records', () => {
        service.add3WRecord({
            who: { organization: 'Test', organizationType: 'UN', cluster: 'Health' },
            what: { activity: 'Medical', activityType: 'service', sector: 'Health' },
            where: { country: 'Taiwan', admin1: 'Kaohsiung' },
            when: { startDate: new Date(), reportingPeriod: 'monthly' },
            status: 'planned',
        });
        expect(service.getAll3WRecords().length).toBeGreaterThan(0);
    });

    it('generateClusterReport returns report', () => {
        const report = service.generateClusterReport('WASH');
        expect(report.cluster).toBe('WASH');
    });

    it('generate3WMatrix returns summary', () => {
        const matrix = service.generate3WMatrix();
        expect(matrix.summary).toBeDefined();
    });

    it('importFromOcha imports records', () => {
        const count = service.importFromOcha([{ organization: 'Test', activity: 'Aid', sector: 'Health', admin1: 'Taipei' }]);
        expect(count).toBe(1);
    });
});
