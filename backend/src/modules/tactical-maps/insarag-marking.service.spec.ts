import { InsaragMarkingService, StructureStatus, HazardType, VictimStatus } from './insarag-marking.service';

describe('InsaragMarkingService', () => {
    let service: InsaragMarkingService;
    const eventEmitter = { emit: jest.fn() };

    const structureData: any = {
        structureId: 'bldg-1',
        structureAddress: '台北市信義區松仁路100號',
        location: { lat: 25.03, lng: 121.56 },
        quadrant1_structureInfo: { type: 'RC', floors: 5, constructionType: 'RC' },
        quadrant2_hazards: { hazards: [], details: '無' },
        quadrant3_victims: { confirmed: { alive: 0, deceased: 0 }, locations: [] },
        quadrant4_teams: [{ teamName: 'USAR-TW-01', entryTime: new Date(), status: 'searching' }],
        overallStatus: StructureStatus.GO,
        markedBy: 'operator-1',
        photos: [],
    };

    const victimData: any = {
        location: { floor: 3, description: '3F 臥室' },
        status: VictimStatus.ALIVE_HEARD,
        count: 1,
        detailsKnown: { trapped: true },
        markedBy: 'rescuer-1',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new InsaragMarkingService(eventEmitter as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createStructureMarking', () => {
        it('should create structure marking', () => {
            const m = service.createStructureMarking(structureData, 'op1');
            expect(m.id).toBeDefined();
            expect(m.structureAddress).toContain('信義區');
            expect(eventEmitter.emit).toHaveBeenCalledWith('insarag.structure.marked', expect.any(Object));
        });
    });

    describe('getStructureMarking', () => {
        it('should retrieve by ID', () => {
            const m = service.createStructureMarking(structureData, 'op1');
            expect(service.getStructureMarking(m.id)).toBeDefined();
        });

        it('should return undefined for unknown ID', () => {
            expect(service.getStructureMarking('bad')).toBeUndefined();
        });
    });

    describe('updateStructureMarking', () => {
        it('should update structure status', () => {
            const m = service.createStructureMarking(structureData, 'op1');
            const updated = service.updateStructureMarking(m.id, { overallStatus: StructureStatus.NO_GO });
            expect(updated?.overallStatus).toBe(StructureStatus.NO_GO);
        });
    });

    describe('getStructuresByStatus', () => {
        it('should filter by status', () => {
            service.createStructureMarking(structureData, 'op1');
            const goStructures = service.getStructuresByStatus(StructureStatus.GO);
            expect(goStructures.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('addVictimMarking', () => {
        it('should add victim to structure', () => {
            const m = service.createStructureMarking(structureData, 'op1');
            const v = service.addVictimMarking(m.id, victimData, 'rescuer-1');
            expect(v.id).toBeDefined();
            expect(v.status).toBe(VictimStatus.ALIVE_HEARD);
            expect(v.count).toBe(1);
        });
    });

    describe('markVictimRescued', () => {
        it('should mark victim as rescued', () => {
            const m = service.createStructureMarking(structureData, 'op1');
            const v = service.addVictimMarking(m.id, victimData, 'r1');
            expect(service.markVictimRescued(v.id, 'r2')).toBe(true);
        });

        it('should return false for missing victim', () => {
            expect(service.markVictimRescued('bad', 'r2')).toBe(false);
        });
    });

    describe('addHazardMarking', () => {
        it('should add hazard marking', () => {
            const h = service.addHazardMarking({
                location: { lat: 25.03, lng: 121.56 },
                type: HazardType.GAS_LEAK, severity: 'high',
                description: '天然氣外洩', mitigationStatus: 'active',
                markedBy: 'op1',
            }, 'op1');
            expect(h.id).toBeDefined();
        });
    });

    describe('clearHazard', () => {
        it('should clear hazard', () => {
            const h = service.addHazardMarking({
                location: { lat: 25.03, lng: 121.56 },
                type: HazardType.ELECTRICAL, severity: 'medium',
                description: '斷電', mitigationStatus: 'active',
                markedBy: 'op1',
            }, 'op1');
            expect(service.clearHazard(h.id, 'op2')).toBe(true);
        });
    });

    describe('getActiveHazards', () => {
        it('should return active hazards', () => {
            service.addHazardMarking({
                location: { lat: 25.03, lng: 121.56 },
                type: HazardType.GAS_LEAK, severity: 'high',
                description: '危害', mitigationStatus: 'active',
                markedBy: 'op1',
            }, 'op1');
            expect(service.getActiveHazards().length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getSearchAndRescueStats', () => {
        it('should return stats', () => {
            const stats = service.getSearchAndRescueStats();
            expect(stats.structures.total).toBe(0);
            expect(stats.victims.confirmed.alive).toBe(0);
        });
    });
});
