import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MapDispatchService } from './map-dispatch.service';
import { Sector } from './entities/sector.entity';
import { RallyPoint } from './entities/rally-point.entity';
import { PlannedRoute } from './entities/planned-route.entity';

// Use dynamic import tokens to avoid missing entity imports
const TASK_TOKEN = 'TaskRepository';
const DECISION_TOKEN = 'DecisionLogRepository';

describe('MapDispatchService', () => {
    let service: MapDispatchService;
    const mockSector = { id: 's1', name: 'Alpha', status: 'active', missionSessionId: 'ms1' };
    const mockPoint = { id: 'rp1', name: 'Rally A' };
    const mockRoute = { id: 'r1' };
    const mockTask = { id: 't1', title: 'Search' };

    beforeEach(async () => {
        const makeRepo = (mock: any) => ({
            create: jest.fn().mockReturnValue(mock),
            save: jest.fn().mockResolvedValue(mock),
            find: jest.fn().mockResolvedValue([mock]),
            findOne: jest.fn().mockResolvedValue(mock),
            count: jest.fn().mockResolvedValue(0),
        });

        // Dynamically get entity classes to avoid import issues
        let TaskEntity: any, DecisionLogEntity: any;
        try {
            const taskModule = await import('../mission-sessions/entities/task.entity');
            TaskEntity = taskModule.Task;
        } catch {
            TaskEntity = class Task {};
        }
        try {
            const decisionModule = await import('../mission-sessions/entities/decision-log.entity');
            DecisionLogEntity = decisionModule.DecisionLog;
        } catch {
            DecisionLogEntity = class DecisionLog {};
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MapDispatchService,
                { provide: getRepositoryToken(Sector), useValue: makeRepo(mockSector) },
                { provide: getRepositoryToken(RallyPoint), useValue: makeRepo(mockPoint) },
                { provide: getRepositoryToken(PlannedRoute), useValue: makeRepo(mockRoute) },
                { provide: getRepositoryToken(TaskEntity), useValue: makeRepo(mockTask) },
                { provide: getRepositoryToken(DecisionLogEntity), useValue: makeRepo({}) },
            ],
        }).compile();
        service = module.get(MapDispatchService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('createSector returns sector', async () => {
        const sector = await service.createSector({ name: 'Alpha' });
        expect(sector.id).toBeDefined();
    });

    it('getSectors returns list', async () => {
        const sectors = await service.getSectors('ms1');
        expect(sectors.length).toBe(1);
    });

    it('createRallyPoint returns point', async () => {
        const point = await service.createRallyPoint({ name: 'Rally A' });
        expect(point.id).toBeDefined();
    });

    it('getRallyPoints returns list', async () => {
        const points = await service.getRallyPoints('ms1');
        expect(points.length).toBe(1);
    });

    it('calculateETA returns distance and time', async () => {
        const eta = await service.calculateETA(25.0, 121.5, 25.1, 121.6);
        expect(eta.distanceKm).toBeGreaterThan(0);
        expect(eta.estimatedMinutes).toBeGreaterThan(0);
    });
});
