import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AtakCotService } from './atak-cot.service';

describe('AtakCotService', () => {
    let service: AtakCotService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AtakCotService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
            ],
        }).compile();
        service = module.get(AtakCotService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('createVolunteerCoT returns valid CoT event', () => {
        const cot = service.createVolunteerCoT('uid1', 'Alpha1', { lat: 25.0, lon: 121.5 });
        expect(cot.uid).toBe('uid1');
        expect(cot.point.lat).toBe(25.0);
        expect(cot.point.lon).toBe(121.5);
    });

    it('createSOSCoT has correct type', () => {
        const cot = service.createSOSCoT('uid2', 'Bravo', { lat: 25.0, lon: 121.5 }, 'Help!');
        expect(cot.type).toBeDefined();
    });

    it('createCASEVACCoT includes patient info', () => {
        const cot = service.createCASEVACCoT('uid3', { lat: 25.0, lon: 121.5 }, {
            triageLevel: 'immediate', count: 2, description: 'Burns',
        });
        expect(cot.detail?.remarks).toContain('immediate');
    });

    it('createWaypointCoT returns waypoint', () => {
        const cot = service.createWaypointCoT('uid4', 'CP1', { lat: 25.0, lon: 121.5 });
        expect(cot.detail?.contact?.callsign).toBe('CP1');
    });

    it('toXml produces valid XML string', () => {
        const cot = service.createVolunteerCoT('uid5', 'Test', { lat: 25.0, lon: 121.5 });
        const xml = service.toXml(cot);
        expect(xml).toContain('<event');
        expect(xml).toContain('uid="uid5"');
    });

    it('parseXml returns null for invalid XML', () => {
        const result = service.parseXml('not xml');
        expect(result).toBeNull();
    });
});
