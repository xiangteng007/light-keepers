import { GeofencingService } from './geofencing.service';

describe('GeofencingService', () => {
    let service: GeofencingService;
    let cache: Record<string, jest.Mock>;

    beforeEach(() => {
        cache = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
        };
        service = new GeofencingService(cache as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createZone', () => {
        it('should create circle zone', async () => {
            const zone = await service.createZone({
                name: '災害區域',
                type: 'circle',
                center: { lat: 25.03, lng: 121.56 },
                radius: 500,
                alertOnEntry: true,
                alertOnExit: false,
                priority: 'high',
                active: true,
            });
            expect(zone.id).toBeDefined();
            expect(zone.name).toBe('災害區域');
            expect(zone.type).toBe('circle');
        });
    });

    describe('getAllZones / getActiveZones', () => {
        it('should return zones from cache', async () => {
            // When cache is empty, should return empty array
            const zones = await service.getAllZones();
            expect(Array.isArray(zones)).toBe(true);
        });
    });

    describe('checkZone (circle)', () => {
        it('should detect point inside circle zone', () => {
            const zone = {
                id: 'z1', name: 'Test', type: 'circle' as const,
                center: { lat: 25.03, lng: 121.56 },
                radius: 1000, // 1km
                alertOnEntry: true, alertOnExit: false,
                priority: 'high' as const, active: true,
                createdAt: new Date(),
            };
            const result = service.checkZone({ lat: 25.03, lng: 121.56 }, zone);
            expect(result).toBeDefined();
            expect(result!.isInside).toBe(true);
        });

        it('should detect point outside circle zone', () => {
            const zone = {
                id: 'z1', name: 'Test', type: 'circle' as const,
                center: { lat: 25.03, lng: 121.56 },
                radius: 100, // 100m
                alertOnEntry: true, alertOnExit: false,
                priority: 'high' as const, active: true,
                createdAt: new Date(),
            };
            // Point far away
            const result = service.checkZone({ lat: 26.0, lng: 122.0 }, zone);
            expect(result?.isInside).toBe(false);
        });
    });

    describe('calculateDistance', () => {
        it('should calculate Haversine distance', () => {
            const d = (service as any).calculateDistance(
                { lat: 25.03, lng: 121.56 },
                { lat: 25.04, lng: 121.56 },
            );
            // ~1.1 km between these points
            expect(d).toBeGreaterThan(500);
            expect(d).toBeLessThan(2000);
        });

        it('should return 0 for same point', () => {
            const d = (service as any).calculateDistance(
                { lat: 25.03, lng: 121.56 },
                { lat: 25.03, lng: 121.56 },
            );
            expect(d).toBeCloseTo(0, 0);
        });
    });

    describe('isPointInPolygon', () => {
        const polygon = [
            { lat: 25.0, lng: 121.5 },
            { lat: 25.0, lng: 121.6 },
            { lat: 25.1, lng: 121.6 },
            { lat: 25.1, lng: 121.5 },
        ];

        it('should return true for point inside', () => {
            expect((service as any).isPointInPolygon({ lat: 25.05, lng: 121.55 }, polygon)).toBe(true);
        });

        it('should return false for point outside', () => {
            expect((service as any).isPointInPolygon({ lat: 26.0, lng: 122.0 }, polygon)).toBe(false);
        });
    });

    describe('getBoundingBox', () => {
        it('should calc bounding box', () => {
            const bb = (service as any).getBoundingBox([
                { lat: 25.0, lng: 121.5 },
                { lat: 25.1, lng: 121.6 },
            ]);
            expect(bb.minLat).toBe(25.0);
            expect(bb.maxLat).toBe(25.1);
            expect(bb.minLng).toBe(121.5);
            expect(bb.maxLng).toBe(121.6);
        });
    });
});
