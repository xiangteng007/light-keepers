import { Map3DService } from './map-3d.service';

describe('Map3DService', () => {
    let service: Map3DService;

    beforeEach(() => {
        service = new Map3DService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('addLayer / getLayers', () => {
        it('should add and retrieve layers', () => {
            service.addLayer({ id: 'l1', name: 'Buildings', type: 'buildings', visible: true, config: {} });
            expect(service.getLayers().length).toBe(1);
        });
    });

    describe('removeLayer', () => {
        it('should remove existing layer', () => {
            service.addLayer({ id: 'l1', name: 'Test', type: 'terrain', visible: true, config: {} });
            expect(service.removeLayer('l1')).toBe(true);
            expect(service.getLayers().length).toBe(0);
        });

        it('should return false for unknown layer', () => {
            expect(service.removeLayer('bad')).toBe(false);
        });
    });

    describe('toggleLayer', () => {
        it('should toggle visibility', () => {
            service.addLayer({ id: 'l1', name: 'Test', type: 'buildings', visible: true, config: {} });
            expect(service.toggleLayer('l1', false)).toBe(true);
        });

        it('should return false for unknown layer', () => {
            expect(service.toggleLayer('bad', true)).toBe(false);
        });
    });

    describe('getCesiumConfig', () => {
        it('should return Cesium configuration', () => {
            service.addLayer({ id: 'l1', name: 'Visible', type: 'buildings', visible: true, config: {} });
            service.addLayer({ id: 'l2', name: 'Hidden', type: 'terrain', visible: false, config: {} });
            const config = service.getCesiumConfig();
            expect(config.terrainProvider).toBeDefined();
            expect(config.layers.length).toBe(1); // only visible
        });
    });

    describe('flyToPosition', () => {
        it('should return flight params', () => {
            const result = service.flyToPosition({ longitude: 121.5, latitude: 25.0, height: 1000 });
            expect(result.destination.longitude).toBe(121.5);
            expect(result.orientation).toBeDefined();
            expect(result.duration).toBe(2);
        });
    });

    describe('createBuildingTileset', () => {
        it('should create tileset config', () => {
            const ts = service.createBuildingTileset('https://tiles.example.com/data');
            expect(ts.type).toBe('3dtiles');
            expect(ts.show).toBe(true);
        });
    });

    describe('highlightBuilding', () => {
        it('should generate highlight conditions', () => {
            const result = service.highlightBuilding('bld-1', '#00ff00');
            expect(result.conditions.length).toBe(1);
        });
    });
});
