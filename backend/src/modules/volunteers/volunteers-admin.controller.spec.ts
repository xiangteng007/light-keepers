import { Test, TestingModule } from '@nestjs/testing';
import { VolunteersAdminController } from './volunteers-admin.controller';
import { VolunteersService } from './volunteers.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('VolunteersAdminController', () => {
    let controller: VolunteersAdminController;

    beforeEach(async () => {
        const mockVolunteer = { id: 'v1', name: 'Test', region: 'Taipei', approvalStatus: 'approved' };
        const mockRepo = { update: jest.fn().mockResolvedValue(undefined) };
        const service = {
            create: jest.fn().mockResolvedValue(mockVolunteer),
            approve: jest.fn().mockResolvedValue(mockVolunteer),
            volunteersRepository: mockRepo,
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VolunteersAdminController],
            providers: [{ provide: VolunteersService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<VolunteersAdminController>(VolunteersAdminController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('seedVolunteers', async () => {
        const result = await controller.seedVolunteers();
        expect(result.success).toBe(true);
        expect(result.data.count).toBe(15); // 15 mock volunteers
    });
});
