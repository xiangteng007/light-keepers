import { Test, TestingModule } from '@nestjs/testing';
import { NiemMappingService } from './niem-mapping.service';

describe('NiemMappingService', () => {
    let service: NiemMappingService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NiemMappingService],
        }).compile();
        service = module.get(NiemMappingService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('toNiemIncident maps internal incident', () => {
        const niem = service.toNiemIncident({ id: 'i1', name: 'Earthquake', severity: 'high', startTime: new Date() });
        expect(niem['nc:ActivityName']).toBe('Earthquake');
    });

    it('toNiemPerson maps person', () => {
        const niem = service.toNiemPerson({ firstName: 'John', lastName: 'Doe' });
        expect(niem['nc:PersonName']!['nc:PersonGivenName']).toBe('John');
    });

    it('toNiemLocation maps location', () => {
        const niem = service.toNiemLocation({ city: 'Taipei', lat: 25.0, lng: 121.5 });
        expect(niem['nc:LocationAddress']).toBeDefined();
    });

    it('createMessage creates NIEM message', () => {
        const msg = service.createMessage({ senderOrg: 'NGO', category: 'EM', text: 'Test' });
        expect(msg['nc:Message']).toBeDefined();
    });

    it('fromNiemIncident reverse maps', () => {
        const niem = service.toNiemIncident({ id: 'i2', name: 'Flood' });
        const internal = service.fromNiemIncident(niem);
        expect(internal.name).toBe('Flood');
    });

    it('getSupportedDomains returns list', () => {
        expect(service.getSupportedDomains().length).toBeGreaterThan(0);
    });
});
