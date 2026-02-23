import { Test, TestingModule } from '@nestjs/testing';
import { CapService } from './cap.service';

describe('CapService', () => {
    let service: CapService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CapService],
        }).compile();
        service = module.get(CapService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('generateAlertId returns a valid ID', () => {
        const id = service.generateAlertId('test.com');
        expect(id).toContain('test.com');
    });

    it('createAlert returns a CAPAlert', () => {
        const alert = service.createAlert('sender1', 'Earthquake', {
            category: ['Geo'],
            severity: 'Severe',
            urgency: 'Immediate',
            description: 'Test earthquake',
        });
        expect(alert.sender).toContain('sender1');
        expect(alert.info[0].event).toBe('Earthquake');
        expect(alert.info[0].severity).toBe('Severe');
    });

    it('createSOSAlert returns rescue-category alert', () => {
        const alert = service.createSOSAlert('sos-sender', {
            location: { lat: 25.0, lng: 121.5 },
            description: 'Need help',
            reporterName: 'John',
        });
        expect(alert.info[0].category).toContain('Rescue');
    });

    it('createHazardAlert returns hazard alert', () => {
        const alert = service.createHazardAlert('hz-sender', {
            type: 'Flood',
            description: 'Flood warning',
            areaName: 'Taipei',
            severity: 'Moderate',
        });
        expect(alert.info[0].severity).toBe('Moderate');
    });

    it('toXml returns valid XML', () => {
        const alert = service.createAlert('xml-test', 'Test', {
            category: ['Safety'],
            severity: 'Minor',
            urgency: 'Future',
            description: 'XML test',
        });
        const xml = service.toXml(alert);
        expect(xml).toContain('<?xml');
        expect(xml).toContain('cap:1.2');
    });
});
