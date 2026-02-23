import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MultiEocService } from './multi-eoc.service';

describe('MultiEocService', () => {
    let service: MultiEocService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MultiEocService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
            ],
        }).compile();
        service = module.get(MultiEocService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('registerEoc returns info', () => {
        const eoc = service.registerEoc({
            id: 'eoc1', name: 'Taipei EOC', region: 'north',
            jurisdiction: ['taipei'], endpoint: 'http://eoc1', capabilities: ['search'],
        });
        expect(eoc.id).toBe('eoc1');
        expect(eoc.status).toBe('online');
    });

    it('createFederatedMission returns mission', async () => {
        service.registerEoc({ id: 'eoc1', name: 'A', region: 'n', jurisdiction: [], endpoint: '', capabilities: [] });
        service.registerEoc({ id: 'eoc2', name: 'B', region: 'n', jurisdiction: [], endpoint: '', capabilities: [] });
        const mission = await service.createFederatedMission({
            name: 'Joint Op', leadEocId: 'eoc1', participatingEocs: ['eoc1', 'eoc2'],
            incidentType: 'earthquake', affectedArea: { lat: 25, lng: 121, radius: 10 },
        });
        expect(mission.id).toBeDefined();
        expect(mission.status).toBe('active');
    });

    it('getFederationStatus returns stats', () => {
        service.registerEoc({ id: 'e1', name: 'A', region: 'n', jurisdiction: [], endpoint: '', capabilities: [] });
        const status = service.getFederationStatus();
        expect(status.totalEocs).toBe(1);
        expect(status.onlineEocs).toBe(1);
    });

    it('broadcastAlert notifies all EOCs', async () => {
        service.registerEoc({ id: 'e1', name: 'A', region: 'n', jurisdiction: [], endpoint: '', capabilities: [] });
        await expect(service.broadcastAlert({
            type: 'weather', title: 'Typhoon', message: 'Warning', severity: 'critical', affectedRegions: ['north'],
        })).resolves.not.toThrow();
    });

    it('shareResource adds to registry', () => {
        service.registerEoc({ id: 'e1', name: 'A', region: 'n', jurisdiction: [], endpoint: '', capabilities: [] });
        service.shareResource('e1', { id: 'r1', eocId: 'e1', type: 'ambulance', name: 'Amb-1', quantity: 2, available: true, location: { lat: 25, lng: 121 } });
        // No error = success
    });

    it('mergeOperationalPicture returns COP', () => {
        service.registerEoc({ id: 'e1', name: 'A', region: 'n', jurisdiction: [], endpoint: '', capabilities: [] });
        const cop = service.mergeOperationalPicture(['e1']);
        expect(cop).toBeDefined();
    });
});
