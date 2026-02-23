import { Test, TestingModule } from '@nestjs/testing';
import { CommandChainController } from './command-chain.controller';
import { CommandChainService } from './command-chain.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('CommandChainController', () => {
    let controller: CommandChainController;

    beforeEach(async () => {
        const service = {
            getActiveCommandChain: jest.fn().mockResolvedValue([]),
            getCommandChain: jest.fn().mockResolvedValue([]),
            getOrgChart: jest.fn().mockResolvedValue({}),
            assignRole: jest.fn().mockResolvedValue({}),
            activateRole: jest.fn().mockResolvedValue({}),
            reliefRole: jest.fn().mockResolvedValue({}),
            getUserRoles: jest.fn().mockResolvedValue([]),
            isCommander: jest.fn().mockResolvedValue(true),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CommandChainController],
            providers: [{ provide: CommandChainService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<CommandChainController>(CommandChainController);
    });

    const req = { user: { id: 'u1' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('getCommandChain returns chain', async () => expect(await controller.getCommandChain('s1')).toBeDefined());
    it('getCommandChainHistory returns history', async () => expect(await controller.getCommandChainHistory('s1')).toBeDefined());
    it('getOrgChart returns org chart', async () => expect(await controller.getOrgChart('s1')).toBeDefined());
    it('assignRole assigns a role', async () => expect(await controller.assignRole('s1', {} as any, req)).toBeDefined());
    it('activateRole activates role', async () => expect(await controller.activateRole('a1')).toBeDefined());
    it('getMyRoles returns user roles', async () => expect(await controller.getMyRoles('s1', req)).toBeDefined());
    it('amICommander checks commander', async () => {
        const result = await controller.amICommander('s1', req);
        expect(result.isCommander).toBe(true);
    });
});
