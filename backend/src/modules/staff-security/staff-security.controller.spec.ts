import { Test, TestingModule } from '@nestjs/testing';
import { StaffSecurityController } from './staff-security.controller';
import { SecurityIncidentService } from './services/security-incident.service';
import { StaffCheckInService } from './services/staff-checkin.service';
import { EvacuationPlanService } from './services/evacuation-plan.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('StaffSecurityController', () => {
    let controller: StaffSecurityController;

    beforeEach(async () => {
        const incidentService = {
            reportIncident: jest.fn().mockResolvedValue({ id: 'i1' }),
            getActiveIncidents: jest.fn().mockResolvedValue([]),
            getIncidentsNearLocation: jest.fn().mockResolvedValue([]),
            updateStatus: jest.fn().mockResolvedValue({ id: 'i1' }),
        };
        const checkInService = {
            checkIn: jest.fn().mockResolvedValue({ id: 'c1' }),
            getOverdueCheckIns: jest.fn().mockResolvedValue([]),
            getLastKnownLocation: jest.fn().mockResolvedValue(null),
            getCheckInHistory: jest.fn().mockResolvedValue([]),
        };
        const evacuationService = {
            createPlan: jest.fn().mockResolvedValue({ id: 'p1' }),
            getPlansForLocation: jest.fn().mockResolvedValue([]),
            initiateEvacuation: jest.fn().mockResolvedValue({ id: 'p1' }),
            getNearestAssemblyPoint: jest.fn().mockResolvedValue(null),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [StaffSecurityController],
            providers: [
                { provide: SecurityIncidentService, useValue: incidentService },
                { provide: StaffCheckInService, useValue: checkInService },
                { provide: EvacuationPlanService, useValue: evacuationService },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<StaffSecurityController>(StaffSecurityController);
    });

    const req = { user: { id: 'u1' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('reportIncident', async () => expect(await controller.reportIncident({} as any)).toBeDefined());
    it('getActiveIncidents', async () => expect(await controller.getActiveIncidents()).toEqual([]));
    it('getIncidentsNearby', async () => expect(await controller.getIncidentsNearby('25', '121', '10')).toEqual([]));
    it('updateIncidentStatus', async () => expect(await controller.updateIncidentStatus('i1', { status: 'resolved' })).toBeDefined());
    it('checkIn', async () => expect(await controller.checkIn({} as any, req)).toBeDefined());
    it('panicButton', async () => expect(await controller.panicButton({}, req)).toBeDefined());
    it('getOverdueCheckIns', async () => expect(await controller.getOverdueCheckIns()).toEqual([]));
    it('getLastLocation', async () => expect(await controller.getLastLocation('s1')).toBeNull());
    it('createEvacuationPlan', async () => expect(await controller.createEvacuationPlan({ locationId: 'l1', plan: {} })).toBeDefined());
    it('getEvacuationPlans', async () => expect(await controller.getEvacuationPlans('l1')).toEqual([]));
    it('initiateEvacuation', async () => expect(await controller.initiateEvacuation('p1', { reason: 'flood' }, req)).toBeDefined());
});
