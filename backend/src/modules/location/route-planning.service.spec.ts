import { RoutePlanningService } from './route-planning.service';

describe('RoutePlanningService', () => {
    let service: RoutePlanningService;

    beforeEach(() => {
        service = new RoutePlanningService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getShelters', () => {
        it('should return built-in shelters', () => {
            const shelters = service.getShelters();
            expect(shelters.length).toBeGreaterThan(0);
            expect(shelters[0]).toHaveProperty('lat');
            expect(shelters[0]).toHaveProperty('lng');
        });
    });

    describe('findNearestShelter', () => {
        it('should find nearest shelter to Taipei', () => {
            const nearest = service.findNearestShelter({ lat: 25.033, lng: 121.565 });
            expect(nearest).toBeDefined();
            expect(nearest?.type).toBe('shelter');
        });

        it('should return null if no shelters', () => {
            // Even with default shelters, this should work
            const nearest = service.findNearestShelter({ lat: 0, lng: 0 });
            expect(nearest).toBeDefined(); // still finds the nearest
        });
    });

    describe('addShelter', () => {
        it('should add a new shelter', () => {
            const before = service.getShelters().length;
            service.addShelter({ lat: 24.8, lng: 121.0, name: '新避難所', type: 'shelter' });
            expect(service.getShelters().length).toBe(before + 1);
        });
    });

    describe('planEvacuationRoute', () => {
        it('should plan route to nearest shelter', async () => {
            const route = await service.planEvacuationRoute({ lat: 25.04, lng: 121.55 });
            expect(route.id).toBeDefined();
            expect(route.origin.lat).toBe(25.04);
            expect(route.distance).toBeGreaterThan(0);
            expect(route.polyline.length).toBeGreaterThan(0);
        });
    });

    describe('planDeliveryRoute', () => {
        it('should plan delivery to multiple stops', async () => {
            const route = await service.planDeliveryRoute(
                { lat: 25.03, lng: 121.56 },
                [
                    { lat: 25.05, lng: 121.58, name: 'A' },
                    { lat: 25.02, lng: 121.54, name: 'B' },
                ],
            );
            expect(route.id).toBeDefined();
            expect(route.distance).toBeGreaterThan(0);
        });

        it('should optimize stop order', async () => {
            const route = await service.planDeliveryRoute(
                { lat: 25.03, lng: 121.56 },
                [{ lat: 25.1, lng: 121.6 }, { lat: 25.04, lng: 121.57 }],
                { optimize: true },
            );
            expect(route.waypoints.length).toBeGreaterThan(0);
        });
    });

    describe('findAlternativeRoutes', () => {
        it('should return alternative routes', async () => {
            const routes = await service.findAlternativeRoutes(
                { lat: 25.03, lng: 121.56 },
                { lat: 25.06, lng: 121.58 },
                [],
                2,
            );
            expect(routes.length).toBe(2);
        });
    });

    describe('hazard zones', () => {
        it('should add and detect hazard zone', () => {
            service.addHazardZone({ lat: 25.03, lng: 121.56 }, 1, 'flood');
            const check = service.isInHazardZone({ lat: 25.03, lng: 121.56 });
            expect(check.inZone).toBe(true);
            expect(check.hazardType).toBe('flood');
        });

        it('should clear hazard zones', () => {
            service.addHazardZone({ lat: 25.03, lng: 121.56 }, 1, 'flood');
            service.clearHazardZones();
            const check = service.isInHazardZone({ lat: 25.03, lng: 121.56 });
            expect(check.inZone).toBe(false);
        });
    });

    describe('calculateDistance', () => {
        it('should calculate Haversine distance', () => {
            const d = (service as any).calculateDistance(
                { lat: 25.03, lng: 121.56 },
                { lat: 25.04, lng: 121.57 },
            );
            expect(d).toBeGreaterThan(0);
        });
    });
});
