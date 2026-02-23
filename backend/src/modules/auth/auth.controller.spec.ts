import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AccountManagementService } from './services/account-management.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AuthController', () => {
    let controller: AuthController;
    let accountManagementService: any;

    const mockRoleOwner = {
        id: 'role-1',
        name: 'owner',
        displayName: '系統管理員',
        level: 5,
    };

    const mockRoleVolunteer = {
        id: 'role-2',
        name: 'volunteer',
        displayName: '登記志工',
        level: 1,
    };

    const mockAccount = {
        id: 'user-123',
        email: 'owner@example.com',
        phone: '0912345678',
        displayName: '管理員',
        avatarUrl: null,
        lineUserId: 'line-uid',
        googleId: 'google-uid',
        volunteerProfileCompleted: true,
        roles: [mockRoleOwner],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: {},
                },
                {
                    provide: RefreshTokenService,
                    useValue: {},
                },
                {
                    provide: AccountManagementService,
                    useValue: {
                        getAccountById: jest.fn(),
                    },
                },
            ],
        })
            .overrideGuard(CoreJwtGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuthController>(AuthController);
        accountManagementService = module.get(AccountManagementService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getProfile', () => {
        it('should calculate roleLevel from DB roles (not JWT string[])', async () => {
            accountManagementService.getAccountById.mockResolvedValue(mockAccount);

            const req = { user: { id: 'user-123', email: 'owner@example.com' } };
            const result = await controller.getProfile(req);

            expect(result.roleLevel).toBe(5);
            expect(result.roles).toEqual(['owner']);
            expect(result.roleDisplayName).toBe('系統管理員');
        });

        it('should return roleLevel 0 and "一般民眾" when no DB roles', async () => {
            accountManagementService.getAccountById.mockResolvedValue({
                ...mockAccount,
                roles: [],
            });

            const req = { user: { id: 'user-123' } };
            const result = await controller.getProfile(req);

            expect(result.roleLevel).toBe(0);
            expect(result.roleDisplayName).toBe('一般民眾');
        });

        it('should fallback to JWT roleLevel when account has no roles', async () => {
            accountManagementService.getAccountById.mockResolvedValue({
                ...mockAccount,
                roles: [],
            });

            const req = { user: { id: 'user-123', roleLevel: 3 } };
            const result = await controller.getProfile(req);

            expect(result.roleLevel).toBe(3);
            expect(result.roleDisplayName).toBe('登記志工');
        });

        it('should use highest role level when multiple roles exist', async () => {
            accountManagementService.getAccountById.mockResolvedValue({
                ...mockAccount,
                roles: [mockRoleVolunteer, mockRoleOwner],
            });

            const req = { user: { id: 'user-123' } };
            const result = await controller.getProfile(req);

            expect(result.roleLevel).toBe(5);
            expect(result.roleDisplayName).toBe('系統管理員');
        });

        it('should return correct linked status', async () => {
            accountManagementService.getAccountById.mockResolvedValue(mockAccount);

            const req = { user: { id: 'user-123' } };
            const result = await controller.getProfile(req);

            expect(result.lineLinked).toBe(true);
            expect(result.googleLinked).toBe(true);
        });

        it('should return false for linked status when IDs are null', async () => {
            accountManagementService.getAccountById.mockResolvedValue({
                ...mockAccount,
                lineUserId: null,
                googleId: null,
            });

            const req = { user: { id: 'user-123' } };
            const result = await controller.getProfile(req);

            expect(result.lineLinked).toBe(false);
            expect(result.googleLinked).toBe(false);
        });

        it('should handle null account gracefully', async () => {
            accountManagementService.getAccountById.mockResolvedValue(null);

            const req = { user: { id: 'user-123', email: 'test@example.com', roleLevel: 0 } };
            const result = await controller.getProfile(req);

            expect(result.roleLevel).toBe(0);
            expect(result.email).toBe('test@example.com');
            expect(result.roleDisplayName).toBe('一般民眾');
        });
    });
});
