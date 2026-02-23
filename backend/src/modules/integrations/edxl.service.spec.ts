import { Test, TestingModule } from '@nestjs/testing';
import { EdxlService } from './edxl.service';

describe('EdxlService', () => {
    let service: EdxlService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EdxlService],
        }).compile();
        service = module.get(EdxlService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('generateDistributionId returns URN format', () => {
        const id = service.generateDistributionId('test-domain');
        expect(id).toContain('urn:light-keepers:test-domain');
    });

    it('createSITREPDistribution returns valid EDXL-DE', () => {
        const dist = service.createSITREPDistribution('sender1', {
            missionSessionId: 'ms1',
            situation: 'Flooding',
            actions: 'Evacuating',
            needs: 'Boats',
            timestamp: new Date().toISOString(),
        });
        expect(dist.distributionType).toBe('Report');
        expect(dist.contentObject[0].contentDescription).toBe('Situation Report');
    });

    it('createResourceRequest returns request distribution', () => {
        const dist = service.createResourceRequest('sender2', {
            missionSessionId: 'ms2',
            resourceType: 'Water',
            quantity: 100,
            urgency: 'Immediate',
            description: 'Need water supplies',
        });
        expect(dist.distributionType).toBe('Request');
    });

    it('toXml returns valid XML', () => {
        const dist = service.createSITREPDistribution('xml-test', {
            missionSessionId: 'ms3',
            situation: 'Test',
            actions: 'Test',
            needs: 'Test',
            timestamp: new Date().toISOString(),
        });
        const xml = service.toXml(dist);
        expect(xml).toContain('<?xml');
        expect(xml).toContain('EDXLDistribution');
    });
});
