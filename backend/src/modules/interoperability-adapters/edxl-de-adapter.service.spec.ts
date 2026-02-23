import { Test, TestingModule } from '@nestjs/testing';
import { EdxlDeAdapterService } from './edxl-de-adapter.service';

describe('EdxlDeAdapterService', () => {
    let service: EdxlDeAdapterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EdxlDeAdapterService],
        }).compile();
        service = module.get(EdxlDeAdapterService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('createDistribution creates an envelope', () => {
        const dist = service.createDistribution({ sender: 'test', type: 'Report', payload: { msg: 'hello' } });
        expect(dist.distributionID).toContain('EDXL-');
        expect(dist.distributionType).toBe('Report');
    });

    it('extractPayload round-trips JSON', () => {
        const dist = service.createDistribution({ sender: 'test', type: 'Report', payload: { key: 'value' } });
        const extracted = service.extractPayload(dist);
        expect(extracted.key).toBe('value');
    });

    it('validate returns valid for complete distribution', () => {
        const dist = service.createDistribution({ sender: 's', type: 'Report', payload: {} });
        expect(service.validate(dist).valid).toBe(true);
    });

    it('validate catches missing fields', () => {
        const result = service.validate({} as any);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('toXml returns XML', () => {
        const dist = service.createDistribution({ sender: 'xml', type: 'Report', payload: {} });
        expect(service.toXml(dist)).toContain('EDXLDistribution');
    });

    it('wrapCapAlert wraps CAP XML', () => {
        const dist = service.wrapCapAlert('<alert/>', 'cap-sender', 'inc-1');
        expect(dist.contentObject![0].nonXMLContent).toBeDefined();
    });
});
