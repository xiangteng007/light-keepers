import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DrillSimulationService } from './drill.service';
import { DrillScenario, DrillStatus } from './entities/drill-scenario.entity';

describe('DrillSimulationService', () => {
    let service: DrillSimulationService;
    let repo: any;
    let eventEmitter: { emit: jest.Mock };

    const mockScenario: Partial<DrillScenario> = {
        id: 'drill-1',
        title: '地震避災演練',
        description: '模擬 6.5 地震',
        status: DrillStatus.DRAFT,
        events: [
            { time: 'T+0', offsetMinutes: 0, type: 'SOS', description: 'SOS 求救', payload: {}, location: { lat: 25, lng: 121 } },
            { time: 'T+5', offsetMinutes: 5, type: 'REPORT', description: '災情回報', payload: {}, location: { lat: 25.1, lng: 121.1 } },
        ],
        createdAt: new Date(),
    };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        repo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'drill-new', ...d })),
            save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            find: jest.fn().mockResolvedValue([mockScenario]),
            findOne: jest.fn().mockResolvedValue({ ...mockScenario }),
            findOneOrFail: jest.fn().mockResolvedValue({ ...mockScenario }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DrillSimulationService,
                { provide: getRepositoryToken(DrillScenario), useValue: repo },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<DrillSimulationService>(DrillSimulationService);
    });

    afterEach(async () => {
        // Stop any running drill to clear timers
        if (service.isDrillMode()) {
            await service.stopDrill();
        }
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== getGlobalState =====
    describe('getGlobalState', () => {
        it('should return initial state with drillMode off', () => {
            const state = service.getGlobalState();
            expect(state.isDrillMode).toBe(false);
            expect(state.activeScenarioId).toBeNull();
        });
    });

    // ===== isDrillMode =====
    describe('isDrillMode', () => {
        it('should return false initially', () => {
            expect(service.isDrillMode()).toBe(false);
        });
    });

    // ===== createScenario =====
    describe('createScenario', () => {
        it('should create scenario with DRAFT status', async () => {
            const data = { title: '新演練', events: [], createdBy: 'admin' };
            const result = await service.createScenario(data);
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
                title: '新演練',
                status: DrillStatus.DRAFT,
            }));
            expect(repo.save).toHaveBeenCalled();
        });
    });

    // ===== updateScenario =====
    describe('updateScenario', () => {
        it('should update and return scenario', async () => {
            const result = await service.updateScenario('drill-1', { title: '更新標題' });
            expect(repo.update).toHaveBeenCalledWith('drill-1', { title: '更新標題' });
            expect(repo.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'drill-1' } });
        });
    });

    // ===== getAllScenarios =====
    describe('getAllScenarios', () => {
        it('should return scenarios ordered by createdAt DESC', async () => {
            const result = await service.getAllScenarios();
            expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
            expect(result).toHaveLength(1);
        });
    });

    // ===== getScenario =====
    describe('getScenario', () => {
        it('should return scenario by id', async () => {
            const result = await service.getScenario('drill-1');
            expect(result).toBeDefined();
        });
    });

    // ===== startDrill =====
    describe('startDrill', () => {
        it('should start drill and set global state', async () => {
            const result = await service.startDrill('drill-1');
            expect(result.success).toBe(true);
            expect(service.isDrillMode()).toBe(true);
            expect(service.getGlobalState().activeScenarioId).toBe('drill-1');
        });

        it('should emit drill.started event', async () => {
            await service.startDrill('drill-1');
            expect(eventEmitter.emit).toHaveBeenCalledWith('drill.started', expect.objectContaining({
                scenarioId: 'drill-1',
            }));
        });

        it('should reject starting when already running', async () => {
            await service.startDrill('drill-1');
            const result = await service.startDrill('drill-1');
            expect(result.success).toBe(false);
            expect(result.message).toContain('已有演練');
        });

        it('should reject nonexistent scenario', async () => {
            repo.findOne.mockResolvedValueOnce(null);
            const result = await service.startDrill('nonexistent');
            expect(result.success).toBe(false);
            expect(result.message).toContain('找不到');
        });
    });

    // ===== stopDrill =====
    describe('stopDrill', () => {
        it('should stop drill and return result', async () => {
            await service.startDrill('drill-1');
            const result = await service.stopDrill();
            expect(result.success).toBe(true);
            expect(result.result).toBeDefined();
            expect(service.isDrillMode()).toBe(false);
        });

        it('should return false when no drill running', async () => {
            const result = await service.stopDrill();
            expect(result.success).toBe(false);
        });

        it('should emit drill.stopped event', async () => {
            await service.startDrill('drill-1');
            eventEmitter.emit.mockClear();
            await service.stopDrill();
            expect(eventEmitter.emit).toHaveBeenCalledWith('drill.stopped', expect.any(Object));
        });
    });

    // ===== recordEventResponse =====
    describe('recordEventResponse', () => {
        it('should record response and emit event', () => {
            service.recordEventResponse(0, 5000);
            expect(eventEmitter.emit).toHaveBeenCalledWith('drill.event.responded', {
                eventIndex: 0,
                responseTimeMs: 5000,
            });
        });
    });
});
