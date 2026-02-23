import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommandChainService } from './command-chain.service';
import { CommandChain, ICSRole } from './entities/command-chain.entity';
import { MissionSession } from './entities/mission-session.entity';

describe('CommandChainService', () => {
    let service: CommandChainService;
    const mockChain = { id: 'cc1', missionSessionId: 'ms1', role: ICSRole.INCIDENT_COMMANDER, status: 'active', userId: 'u1', userName: 'IC Smith' };
    const mockSession = { id: 'ms1', name: 'Test' };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CommandChainService,
                { provide: getRepositoryToken(CommandChain), useValue: {
                    create: jest.fn().mockReturnValue(mockChain),
                    save: jest.fn().mockResolvedValue(mockChain),
                    find: jest.fn().mockResolvedValue([mockChain]),
                    // findOne returns null initially (no existing assignment) to allow assignRole
                    findOne: jest.fn().mockResolvedValue(null),
                } },
                { provide: getRepositoryToken(MissionSession), useValue: {
                    findOne: jest.fn().mockResolvedValue(mockSession),
                } },
            ],
        }).compile();
        service = module.get(CommandChainService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('assignRole returns assignment', async () => {
        const result = await service.assignRole({
            missionSessionId: 'ms1', role: ICSRole.INCIDENT_COMMANDER,
            userId: 'u1', userName: 'IC Smith', assignedBy: 'admin',
        });
        expect(result.id).toBeDefined();
    });

    it('getCommandChain returns chain', async () => {
        const chain = await service.getCommandChain('ms1');
        expect(chain.length).toBe(1);
    });

    it('getUserRoles returns roles', async () => {
        const roles = await service.getUserRoles('ms1', 'u1');
        expect(roles.length).toBe(1);
    });

    it('isCommander checks role', async () => {
        const result = await service.isCommander('ms1', 'u1');
        expect(typeof result).toBe('boolean');
    });

    it('isSectionChief checks role', async () => {
        const result = await service.isSectionChief('ms1', 'u1');
        expect(typeof result).toBe('boolean');
    });
});
