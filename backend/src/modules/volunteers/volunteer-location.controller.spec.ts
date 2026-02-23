import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VolunteerLocationController } from './volunteer-location.controller';
import { VolunteerAssignment } from './volunteer-assignments.entity';
import { Volunteer } from './volunteers.entity';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('VolunteerLocationController', () => {
    let controller: VolunteerLocationController;

    const mockAssignment = {
        id: 'a1',
        volunteerId: 'v1',
        taskTitle: 'Task1',
        status: 'in_progress',
        lastLocationLat: 25.0,
        lastLocationLng: 121.5,
        lastLocationAt: new Date(),
        checkInAt: new Date(),
        checkOutAt: null,
        createdAt: new Date(),
    };

    beforeEach(async () => {
        const assignmentRepo = {
            findOne: jest.fn().mockResolvedValue({ ...mockAssignment, save: jest.fn() }),
            find: jest.fn().mockResolvedValue([mockAssignment]),
            save: jest.fn().mockResolvedValue(mockAssignment),
        };
        const volunteerRepo = {
            find: jest.fn().mockResolvedValue([{ id: 'v1', name: 'Test' }]),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VolunteerLocationController],
            providers: [
                { provide: getRepositoryToken(VolunteerAssignment), useValue: assignmentRepo },
                { provide: getRepositoryToken(Volunteer), useValue: volunteerRepo },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<VolunteerLocationController>(VolunteerLocationController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('updateLocation', async () => expect((await controller.updateLocation('a1', { lat: 25, lng: 121 })).success).toBe(true));
    it('getActiveVolunteerLocations', async () => expect((await controller.getActiveVolunteerLocations()).success).toBe(true));
    it('getVolunteerLocationHistory', async () => expect((await controller.getVolunteerLocationHistory('v1')).success).toBe(true));
});
