import { GeofenceService } from './geofence.service';

describe('GeofenceService', () => {
    let service: GeofenceService;
    let eventEmitter: { emit: jest.Mock };

    const missionId = 'mission-1';
    // A square polygon around 25.03, 121.56
    const squareZone = {
        id: 'zone-1', name: '搜救區A', missionSessionId: missionId,
        coordinates: [
            { lat: 25.04, lng: 121.55 }, { lat: 25.04, lng: 121.57 },
            { lat: 25.02, lng: 121.57 }, { lat: 25.02, lng: 121.55 },
        ],
        type: 'sector' as const,
        iapHighlights: ['注意落石'],
        notifyOnEnter: true, notifyOnExit: true,
    };

    beforeEach(() => {
        eventEmitter = { emit: jest.fn() };
        service = new GeofenceService(eventEmitter as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('registerZone', () => {
        it('should register a zone', () => {
            service.registerZone(squareZone);
            const zones = service.getZones(missionId);
            expect(zones).toHaveLength(1);
            expect(zones[0].id).toBe('zone-1');
        });
    });

    describe('registerZones', () => {
        it('should batch-register zones', () => {
            service.registerZones([squareZone, { ...squareZone, id: 'zone-2', name: 'B' }]);
            expect(service.getZones(missionId)).toHaveLength(2);
        });
    });

    describe('removeZone', () => {
        it('should remove zone by ID', () => {
            service.registerZone(squareZone);
            const removed = service.removeZone(missionId, 'zone-1');
            expect(removed).toBe(true);
            expect(service.getZones(missionId)).toHaveLength(0);
        });

        it('should return false for missing zone', () => {
            expect(service.removeZone(missionId, 'nonexistent')).toBe(false);
        });
    });

    describe('checkLocation', () => {
        it('should detect volunteer entering zone', () => {
            service.registerZone(squareZone);
            const events = service.checkLocation('vol-1', '志工A', { lat: 25.03, lng: 121.56 }, missionId);
            expect(events.some(e => e.type === 'enter')).toBe(true);
        });

        it('should detect volunteer exiting zone', () => {
            service.registerZone(squareZone);
            // first enter
            service.checkLocation('vol-1', '志工A', { lat: 25.03, lng: 121.56 }, missionId);
            // then exit
            const events = service.checkLocation('vol-1', '志工A', { lat: 25.00, lng: 121.50 }, missionId);
            expect(events.some(e => e.type === 'exit')).toBe(true);
        });

        it('should not emit for location outside any zone', () => {
            service.registerZone(squareZone);
            const events = service.checkLocation('vol-2', '志工B', { lat: 24.90, lng: 121.40 }, missionId);
            expect(events).toHaveLength(0);
        });
    });

    describe('point-in-polygon (via checkLocation)', () => {
        it('point inside polygon triggers enter', () => {
            service.registerZone(squareZone);
            const events = service.checkLocation('vol-3', '志工C', { lat: 25.03, lng: 121.56 }, missionId);
            expect(events.length).toBeGreaterThan(0);
        });

        it('point outside polygon triggers nothing', () => {
            service.registerZone(squareZone);
            const events = service.checkLocation('vol-4', '志工D', { lat: 24.90, lng: 121.40 }, missionId);
            expect(events).toHaveLength(0);
        });
    });

    describe('clearMission', () => {
        it('should clear all zones for a mission', () => {
            service.registerZone(squareZone);
            service.clearMission(missionId);
            expect(service.getZones(missionId)).toHaveLength(0);
        });
    });
});
