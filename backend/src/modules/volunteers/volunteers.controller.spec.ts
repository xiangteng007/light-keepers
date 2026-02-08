import { VolunteersController } from './volunteers.controller';
import { VolunteersService } from './volunteers.service';
import { createTestModule } from '../../test/helpers/create-test-module';

describe('VolunteersController', () => {
    let controller: VolunteersController;
    let service: VolunteersService;

    const mockService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findAvailable: jest.fn(),
        findEligible: jest.fn(),
        findOne: jest.fn(),
        findPending: jest.fn(),
        findApproved: jest.fn(),
        getPendingCount: jest.fn(),
        getStats: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        approve: jest.fn(),
        reject: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module = await createTestModule({
            controllers: [VolunteersController],
            providers: [{ provide: VolunteersService, useValue: mockService }],
        }).compile();

        controller = module.get<VolunteersController>(VolunteersController);
        service = module.get<VolunteersService>(VolunteersService);
    });

    afterEach(() => jest.clearAllMocks());

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create a volunteer', async () => {
            const dto = { name: '張三', phone: '0912345678' };
            const volunteer = { id: 'v1', ...dto };
            mockService.create.mockResolvedValue(volunteer);

            const result = await controller.create(dto as any);

            expect(service.create).toHaveBeenCalledWith(dto);
            expect(result).toEqual({ success: true, message: '志工註冊成功', data: volunteer });
        });
    });

    describe('findAll', () => {
        it('should return volunteers list', async () => {
            const volunteers = [{ id: 'v1' }];
            mockService.findAll.mockResolvedValue(volunteers);

            const result = await controller.findAll();

            expect(service.findAll).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });
    });

    describe('findOne', () => {
        it('should return volunteer by ID', async () => {
            const volunteer = { id: 'v1', name: '張三' };
            mockService.findOne.mockResolvedValue(volunteer);

            const result = await controller.findOne('v1');

            expect(service.findOne).toHaveBeenCalledWith('v1');
            expect(result).toEqual({ success: true, data: volunteer });
        });
    });

    describe('getStats', () => {
        it('should return volunteer statistics', async () => {
            const stats = { total: 100, active: 80 };
            mockService.getStats.mockResolvedValue(stats);

            const result = await controller.getStats();

            expect(service.getStats).toHaveBeenCalled();
            expect(result).toEqual({ success: true, data: stats });
        });
    });

    describe('findPending', () => {
        it('should return pending volunteers', async () => {
            const volunteers = [{ id: 'v2', status: 'pending' }];
            mockService.findPending.mockResolvedValue(volunteers);

            const result = await controller.findPending();

            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });
    });

    describe('approve', () => {
        it('should approve volunteer', async () => {
            const volunteer = { id: 'v1', status: 'approved' };
            mockService.approve.mockResolvedValue(volunteer);

            const result = await controller.approve('v1', 'admin', '表現優秀');

            expect(service.approve).toHaveBeenCalledWith('v1', 'admin', '表現優秀');
            expect(result.success).toBe(true);
            expect(result.message).toBe('志工申請已核准');
        });
    });

    describe('reject', () => {
        it('should reject volunteer', async () => {
            const volunteer = { id: 'v1', status: 'rejected' };
            mockService.reject.mockResolvedValue(volunteer);

            const result = await controller.reject('v1', 'admin', '不符資格');

            expect(service.reject).toHaveBeenCalledWith('v1', 'admin', '不符資格');
            expect(result.success).toBe(true);
        });
    });

    describe('update', () => {
        it('should update volunteer', async () => {
            const dto = { name: '李四' };
            const volunteer = { id: 'v1', ...dto };
            mockService.update.mockResolvedValue(volunteer);

            const result = await controller.update('v1', dto as any);

            expect(service.update).toHaveBeenCalledWith('v1', dto);
            expect(result.success).toBe(true);
        });
    });

    describe('delete', () => {
        it('should delete volunteer', async () => {
            mockService.delete.mockResolvedValue(undefined);

            const result = await controller.delete('v1');

            expect(service.delete).toHaveBeenCalledWith('v1');
            expect(result).toEqual({ success: true, message: '志工已刪除' });
        });
    });
});
