import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LineLiffService } from './line-liff.service';

describe('LineLiffService', () => {
    let service: LineLiffService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LineLiffService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-liff-id') } },
            ],
        }).compile();
        service = module.get(LineLiffService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getLiffConfig returns config', () => {
        const config = service.getLiffConfig();
        expect(config.liffId).toBe('mock-liff-id');
    });

    it('buildDefaultRichMenu returns menu structure', () => {
        const menu = service.buildDefaultRichMenu();
        expect(menu.size).toBeDefined();
        expect(menu.areas.length).toBeGreaterThan(0);
    });

    it('buildEmergencyRichMenu returns menu', () => {
        const menu = service.buildEmergencyRichMenu();
        expect(menu.name).toBeDefined();
    });

    it('buildAlertFlexMessage returns flex message', () => {
        const msg = service.buildAlertFlexMessage({
            id: 'a1', type: 'earthquake', title: 'Earthquake',
            description: 'Strong quake', severity: 'red',
            affectedArea: 'Taipei', issuedAt: new Date(),
        });
        expect(msg.type).toBe('flex');
    });

    it('buildShelterCarousel returns carousel', () => {
        const msg = service.buildShelterCarousel([{
            id: 's1', name: 'Shelter A', address: '123 St',
            lat: 25, lng: 121, distance: 0.5, capacity: 100, currentOccupancy: 30,
        }]);
        expect(msg.type).toBe('flex');
    });

    it('buildCheckinSuccessFlexMessage returns message', () => {
        const msg = service.buildCheckinSuccessFlexMessage({
            volunteerName: 'John', location: 'HQ', checkinTime: new Date(),
        });
        expect(msg.type).toBe('flex');
    });
});
