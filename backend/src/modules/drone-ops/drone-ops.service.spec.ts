import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DroneOpsService, DroneStatus, MissionType } from './drone-ops.service';

const delay = (ms = 2) => new Promise(r => setTimeout(r, ms));

describe('DroneOpsService', () => {
    let service: DroneOpsService;
    let eventEmitter: { emit: jest.Mock };

    const baseDrone = { id: 'drone-1', name: 'Eagle-1', model: 'DJI M30', serialNumber: 'SN001' };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DroneOpsService,
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();
        service = module.get<DroneOpsService>(DroneOpsService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    // ===== Drone Management =====
    describe('registerDrone', () => {
        it('should register with OFFLINE status', () => {
            const drone = service.registerDrone(baseDrone);
            expect(drone.status).toBe(DroneStatus.OFFLINE);
            expect(drone.id).toBe('drone-1');
        });
    });

    describe('updateTelemetry', () => {
        it('should update telemetry and emit event', () => {
            service.registerDrone(baseDrone);
            const updated = service.updateTelemetry('drone-1', {
                status: DroneStatus.IN_FLIGHT,
                telemetry: { batteryPercent: 80, batteryVoltage: 48, signalStrength: 95, gpsCount: 12, flightTime: 300, distanceFromHome: 500 },
            });
            expect(updated!.status).toBe(DroneStatus.IN_FLIGHT);
            expect(eventEmitter.emit).toHaveBeenCalledWith('drone.telemetry', expect.anything());
        });

        it('should emit lowBattery when battery < 20%', () => {
            service.registerDrone(baseDrone);
            service.updateTelemetry('drone-1', {
                telemetry: { batteryPercent: 15, batteryVoltage: 40, signalStrength: 80, gpsCount: 10, flightTime: 600, distanceFromHome: 1000 },
            });
            expect(eventEmitter.emit).toHaveBeenCalledWith('drone.lowBattery', expect.objectContaining({ battery: 15 }));
        });

        it('should return null for unknown drone', () => {
            expect(service.updateTelemetry('fake', {})).toBeNull();
        });
    });

    describe('getAllDrones / getActiveDrones', () => {
        it('should return all and filter active', () => {
            service.registerDrone(baseDrone);
            service.registerDrone({ id: 'drone-2', name: 'Eagle-2', model: 'DJI M30', serialNumber: 'SN002' });
            service.updateTelemetry('drone-1', { status: DroneStatus.IN_FLIGHT });
            expect(service.getAllDrones()).toHaveLength(2);
            expect(service.getActiveDrones()).toHaveLength(1);
        });
    });

    // ===== Mission Management =====
    describe('createMission', () => {
        it('should create mission with planned status', () => {
            const mission = service.createMission({ droneId: 'drone-1', type: MissionType.SEARCH, waypoints: [], createdBy: 'op-1' });
            expect(mission.status).toBe('planned');
            expect(mission.id).toContain('mission-');
        });
    });

    describe('startMission', () => {
        it('should activate mission and set drone to TAKEOFF', () => {
            service.registerDrone(baseDrone);
            const mission = service.createMission({ droneId: 'drone-1', type: MissionType.MAPPING, waypoints: [], createdBy: 'op-1' });
            const started = service.startMission(mission.id);
            expect(started!.status).toBe('active');
            expect(service.getDrone('drone-1')!.status).toBe(DroneStatus.TAKEOFF);
            expect(eventEmitter.emit).toHaveBeenCalledWith('drone.missionStart', expect.anything());
        });

        it('should return null for unknown mission', () => {
            expect(service.startMission('fake')).toBeNull();
        });
    });

    describe('completeMission', () => {
        it('should complete mission and set drone to RETURNING', () => {
            service.registerDrone(baseDrone);
            const mission = service.createMission({ droneId: 'drone-1', type: MissionType.SURVEILLANCE, waypoints: [], createdBy: 'op-1' });
            service.startMission(mission.id);
            const completed = service.completeMission(mission.id);
            expect(completed!.status).toBe('completed');
            expect(service.getDrone('drone-1')!.status).toBe(DroneStatus.RETURNING);
        });
    });

    describe('abortMission', () => {
        it('should abort mission with reason', () => {
            service.registerDrone(baseDrone);
            const mission = service.createMission({ droneId: 'drone-1', type: MissionType.DELIVERY, waypoints: [], createdBy: 'op-1' });
            const aborted = service.abortMission(mission.id, '天候不佳');
            expect(aborted!.status).toBe('aborted');
            expect(eventEmitter.emit).toHaveBeenCalledWith('drone.missionAbort', expect.objectContaining({ reason: '天候不佳' }));
        });
    });

    // ===== Detections =====
    describe('addDetection / getDetections', () => {
        it('should add and retrieve detections', () => {
            service.addDetection({ droneId: 'drone-1', type: 'person', position: { lat: 25.0, lng: 121.5 }, confidence: 0.95 });
            const detections = service.getDetections('drone-1');
            expect(detections).toHaveLength(1);
            expect(detections[0].type).toBe('person');
            expect(eventEmitter.emit).toHaveBeenCalledWith('drone.detection', expect.anything());
        });
    });

    // ===== Emergency Commands =====
    describe('returnToHome', () => {
        it('should set drone to RETURNING', () => {
            service.registerDrone(baseDrone);
            expect(service.returnToHome('drone-1')).toBe(true);
            expect(service.getDrone('drone-1')!.status).toBe(DroneStatus.RETURNING);
        });

        it('should return false for unknown drone', () => {
            expect(service.returnToHome('fake')).toBe(false);
        });
    });

    describe('emergencyLand', () => {
        it('should set drone to EMERGENCY', () => {
            service.registerDrone(baseDrone);
            expect(service.emergencyLand('drone-1')).toBe(true);
            expect(service.getDrone('drone-1')!.status).toBe(DroneStatus.EMERGENCY);
            expect(eventEmitter.emit).toHaveBeenCalledWith('drone.emergency', expect.objectContaining({ command: 'land' }));
        });
    });
});
