import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('ApprovalController', () => {
    let controller: ApprovalController;

    beforeEach(async () => {
        const service = {
            getPendingApprovals: jest.fn().mockResolvedValue([]),
            approve: jest.fn().mockResolvedValue({ id: 'a1' }),
            reject: jest.fn().mockResolvedValue({ id: 'a1' }),
            getTransactionDetail: jest.fn().mockResolvedValue({ id: 'a1' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ApprovalController],
            providers: [{ provide: ApprovalService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ApprovalController>(ApprovalController);
    });

    const req = { user: { uid: 'u1', roleLevel: 5, role: 'admin', name: 'Admin', email: 'a@b.c' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('getPendingApprovals returns list', async () => expect(await controller.getPendingApprovals(undefined, undefined, undefined, req)).toBeDefined());
    it('approve approves', async () => expect(await controller.approve('a1', req)).toBeDefined());
    it('reject rejects', async () => expect(await controller.reject('a1', 'reason', req)).toBeDefined());
    it('getDetail returns detail', async () => expect(await controller.getDetail('a1')).toBeDefined());
});
