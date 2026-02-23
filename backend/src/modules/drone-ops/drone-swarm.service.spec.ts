import { DroneSwarmService } from './drone-swarm.service';

describe('DroneSwarmService', () => {
    let service: DroneSwarmService;
    let configService: Record<string, jest.Mock>;
    let eventEmitter: Record<string, jest.Mock>;

    const mockDroneReg = {
        id: 'drone-1', model: 'DJI M300',
        capabilities: ['camera', 'thermal'], homePosition: { lat: 25.03, lng: 121.56 },
    };

    beforeEach(() => {
        configService = { get: jest.fn().mockReturnValue(100) };
        eventEmitter = { emit: jest.fn() };
        service = new DroneSwarmService(configService as any, eventEmitter as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('registerDrone', () => {
        it('should register a drone', () => {
            const drone = service.registerDrone(mockDroneReg);
            expect(drone.id).toBe('drone-1');
            expect(drone.status).toBe('standby');
        });
    });

    describe('createSearchMission', () => {
        it('should create search mission with available drones', async () => {
            service.registerDrone(mockDroneReg);
            service.registerDrone({ ...mockDroneReg, id: 'drone-2' });
            const mission = await service.createSearchMission({
                searchArea: { bounds: { north: 25.1, south: 25.0, east: 121.6, west: 121.5 }, altitude: 100 } as any,
                minDrones: 1,
            });
            expect(mission.status).toBe('planning');
            expect(mission.assignedDrones.length).toBeGreaterThan(0);
        });

        it('should throw if insufficient drones', async () => {
            await expect(
                service.createSearchMission({
                    searchArea: { bounds: { north: 25.1, south: 25.0, east: 121.6, west: 121.5 } } as any,
                    minDrones: 10,
                }),
            ).rejects.toThrow();
        });
    });

    describe('startMission', () => {
        it('should start mission', async () => {
            service.registerDrone(mockDroneReg);
            const mission = await service.createSearchMission({
                searchArea: { bounds: { north: 25.1, south: 25.0, east: 121.6, west: 121.5 }, altitude: 50 } as any,
                minDrones: 1,
            });
            await service.startMission(mission.id);
            expect(eventEmitter.emit).toHaveBeenCalled();
        });
    });

    describe('updateDroneTelemetry', () => {
        it('should update telemetry', () => {
            service.registerDrone(mockDroneReg);
            service.updateDroneTelemetry('drone-1', {
                position: { lat: 25.04, lng: 121.57 }, battery: 85,
            } as any);
            const status = service.getSwarmStatus();
            expect(status.drones.length).toBe(1);
        });

        it('should trigger emergency return on low battery', async () => {
            service.registerDrone(mockDroneReg);
            // start a mission so drone is 'flying'
            const mission = await service.createSearchMission({
                searchArea: { bounds: { north: 25.1, south: 25.0, east: 121.6, west: 121.5 }, altitude: 50 } as any,
                minDrones: 1,
            });
            await service.startMission(mission.id);
            // low battery telemetry
            service.updateDroneTelemetry('drone-1', {
                position: { lat: 25.04, lng: 121.57 }, battery: 10,
            } as any);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'swarm.drone.emergency-return',
                expect.objectContaining({ droneId: 'drone-1' }),
            );
        });
    });

    describe('reportFinding', () => {
        it('should add finding to mission', async () => {
            service.registerDrone(mockDroneReg);
            const mission = await service.createSearchMission({
                searchArea: { bounds: { north: 25.1, south: 25.0, east: 121.6, west: 121.5 }, altitude: 50 } as any,
                minDrones: 1,
            });
            await service.startMission(mission.id);
            service.reportFinding('drone-1', {
                type: 'debris', position: { lat: 25.05, lng: 121.55 }, confidence: 0.9,
            });
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'swarm.finding.reported', expect.objectContaining({ type: 'debris' }),
            );
        });
    });

    describe('getSwarmStatus', () => {
        it('should return swarm status', () => {
            service.registerDrone(mockDroneReg);
            const status = service.getSwarmStatus();
            expect(status.drones.length).toBe(1);
            expect(status.activeMissions).toBe(0);
        });
    });

    describe('endMission', () => {
        it('should end mission and recall drones', async () => {
            service.registerDrone(mockDroneReg);
            const mission = await service.createSearchMission({
                searchArea: { bounds: { north: 25.1, south: 25.0, east: 121.6, west: 121.5 }, altitude: 50 } as any,
                minDrones: 1,
            });
            await service.startMission(mission.id);
            await service.endMission(mission.id);
            expect(eventEmitter.emit).toHaveBeenCalledWith('swarm.mission.ended', expect.any(Object));
        });
    });
});
