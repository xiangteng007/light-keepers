import { IndoorPositioningService } from './indoor-positioning.service';

describe('IndoorPositioningService', () => {
    let service: IndoorPositioningService;

    beforeEach(() => {
        service = new IndoorPositioningService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('registerBeacon', () => {
        it('should register a beacon', () => {
            service.registerBeacon({
                id: 'b1', uuid: 'uuid-1', major: 1, minor: 1,
                position: { x: 0, y: 0, floor: 1 }, buildingId: 'bldg-1',
            });
            const beacons = service.getBeaconsByBuilding('bldg-1');
            expect(beacons.length).toBe(1);
        });
    });

    describe('getBeaconsByBuilding', () => {
        it('should filter by building', () => {
            service.registerBeacon({ id: 'b1', uuid: 'u1', major: 1, minor: 1, position: { x: 0, y: 0, floor: 1 }, buildingId: 'A' });
            service.registerBeacon({ id: 'b2', uuid: 'u2', major: 1, minor: 2, position: { x: 5, y: 0, floor: 1 }, buildingId: 'B' });
            expect(service.getBeaconsByBuilding('A').length).toBe(1);
            expect(service.getBeaconsByBuilding('B').length).toBe(1);
            expect(service.getBeaconsByBuilding('C').length).toBe(0);
        });
    });

    describe('calculatePosition', () => {
        beforeEach(() => {
            service.registerBeacon({ id: 'b1', uuid: 'u', major: 1, minor: 1, position: { x: 0, y: 0, floor: 1 }, buildingId: 'A' });
            service.registerBeacon({ id: 'b2', uuid: 'u', major: 1, minor: 2, position: { x: 10, y: 0, floor: 1 }, buildingId: 'A' });
            service.registerBeacon({ id: 'b3', uuid: 'u', major: 1, minor: 3, position: { x: 5, y: 10, floor: 1 }, buildingId: 'A' });
        });

        it('should return null if fewer than 3 signals', () => {
            expect(service.calculatePosition([{ beaconId: 'b1', rssi: -60 }])).toBeNull();
        });

        it('should calculate position with 3+ signals', () => {
            const pos = service.calculatePosition([
                { beaconId: 'b1', rssi: -55 },
                { beaconId: 'b2', rssi: -60 },
                { beaconId: 'b3', rssi: -65 },
            ]);
            expect(pos).toBeDefined();
            expect(pos!.floor).toBe(1);
            expect(pos!.method).toBe('beacon');
            expect(typeof pos!.x).toBe('number');
            expect(typeof pos!.y).toBe('number');
        });

        it('should return null if beacons not found', () => {
            const pos = service.calculatePosition([
                { beaconId: 'x1', rssi: -55 },
                { beaconId: 'x2', rssi: -60 },
                { beaconId: 'x3', rssi: -65 },
            ]);
            expect(pos).toBeNull();
        });
    });

    describe('rssiToDistance', () => {
        it('should convert RSSI to distance', () => {
            const d = (service as any).rssiToDistance(-59);
            expect(d).toBeCloseTo(1.0, 0); // ~1m at reference
        });

        it('should return larger distance for weaker signal', () => {
            const near = (service as any).rssiToDistance(-50);
            const far = (service as any).rssiToDistance(-80);
            expect(far).toBeGreaterThan(near);
        });
    });

    describe('trilaterate', () => {
        it('should calculate weighted centroid', () => {
            const result = (service as any).trilaterate([
                { x: 0, y: 0, distance: 1 },
                { x: 10, y: 0, distance: 1 },
                { x: 5, y: 10, distance: 1 },
            ]);
            expect(result.x).toBeCloseTo(5, 0);
            expect(result.y).toBeCloseTo(10 / 3, 0);
        });
    });
});
