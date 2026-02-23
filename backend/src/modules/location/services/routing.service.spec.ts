import { RoutingService } from './routing.service';

describe('RoutingService', () => {
    let service: RoutingService;

    beforeEach(() => {
        service = new RoutingService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('calculateRoute', () => {
        it('should calculate driving route', async () => {
            const route = await service.calculateRoute(
                { lat: 25.033, lng: 121.565 },
                { lat: 25.042, lng: 121.512 },
                'driving',
            );
            expect(route.mode).toBe('driving');
            expect(route.totalDistance).toBeGreaterThan(0);
            expect(route.segments.length).toBe(1);
        });

        it('should calculate walking route (slower)', async () => {
            const driving = await service.calculateRoute(
                { lat: 25.033, lng: 121.565 },
                { lat: 25.042, lng: 121.512 },
                'driving',
            );
            const walking = await service.calculateRoute(
                { lat: 25.033, lng: 121.565 },
                { lat: 25.042, lng: 121.512 },
                'walking',
            );
            expect(walking.totalDuration).toBeGreaterThan(driving.totalDuration);
        });

        it('should calculate emergency route (fastest)', async () => {
            const route = await service.calculateRoute(
                { lat: 25.0, lng: 121.5 },
                { lat: 25.1, lng: 121.6 },
                'emergency',
            );
            expect(route.mode).toBe('emergency');
        });
    });

    describe('calculateMultiStop', () => {
        it('should calculate multi-stop route', async () => {
            const route = await service.calculateMultiStop([
                { lat: 25.0, lng: 121.5 },
                { lat: 25.05, lng: 121.55 },
                { lat: 25.1, lng: 121.6 },
            ]);
            expect(route.segments.length).toBe(2);
            expect(route.totalDistance).toBeGreaterThan(0);
        });

        it('should throw for less than 2 waypoints', async () => {
            await expect(service.calculateMultiStop([{ lat: 25.0, lng: 121.5 }]))
                .rejects.toThrow('At least 2 waypoints');
        });
    });

    describe('optimizeWaypoints', () => {
        it('should optimize with nearest-neighbor', () => {
            const waypoints = [
                { lat: 25.0, lng: 121.5 },
                { lat: 25.1, lng: 121.6 },   // far
                { lat: 25.01, lng: 121.51 },  // near
            ];
            const opt = service.optimizeWaypoints(waypoints);
            expect(opt.length).toBe(3);
            expect(opt[0]).toEqual(waypoints[0]); // start unchanged
            expect(opt[1]).toEqual(waypoints[2]); // nearest first
        });

        it('should return as-is for 2 or fewer', () => {
            const wp = [{ lat: 25.0, lng: 121.5 }];
            expect(service.optimizeWaypoints(wp)).toEqual(wp);
        });
    });

    describe('haversineDistance', () => {
        it('should calculate distance in km', () => {
            const d = (service as any).haversineDistance(
                { lat: 25.033, lng: 121.565 },
                { lat: 25.042, lng: 121.512 },
            );
            expect(d).toBeGreaterThan(0);
            expect(d).toBeLessThan(10); // should be ~5km
        });
    });
});
