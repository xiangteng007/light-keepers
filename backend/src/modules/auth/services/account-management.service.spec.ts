import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountManagementService } from './account-management.service';
import { Account } from '../../accounts/entities/account.entity';
import { Role } from '../../accounts/entities/role.entity';
import { PagePermission } from '../../accounts/entities/page-permission.entity';
import * as bcrypt from 'bcryptjs';

describe('AccountManagementService', () => {
    let service: AccountManagementService;
    let accountRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock; delete: jest.Mock };
    let roleRepo: { find: jest.Mock; findOne: jest.Mock };
    let pagePermRepo: { find: jest.Mock };

    const mockAccount = {
        id: 'acc-1',
        email: 'test@example.com',
        displayName: '測試使用者',
        avatarUrl: null,
        passwordHash: '',
        prefAlertNotifications: true,
        prefTaskNotifications: true,
        prefTrainingNotifications: false,
        approvalStatus: 'approved',
        phoneVerified: false,
        emailVerified: true,
        volunteerProfileCompleted: false,
        roles: [{ name: 'volunteer', level: 2 }],
    };

    beforeEach(async () => {
        accountRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockImplementation(a => Promise.resolve(a)),
            create: jest.fn().mockImplementation(data => ({ id: 'new-acc', ...data })),
            delete: jest.fn().mockResolvedValue(undefined),
        };
        roleRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
        };
        pagePermRepo = {
            find: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountManagementService,
                { provide: getRepositoryToken(Account), useValue: accountRepo },
                { provide: getRepositoryToken(Role), useValue: roleRepo },
                { provide: getRepositoryToken(PagePermission), useValue: pagePermRepo },
            ],
        }).compile();

        service = module.get<AccountManagementService>(AccountManagementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== getAccountById =====
    describe('getAccountById', () => {
        it('should return null for unknown account', async () => {
            const result = await service.getAccountById('unknown');
            expect(result).toBeNull();
        });

        it('should return account with roles', async () => {
            accountRepo.findOne.mockResolvedValueOnce(mockAccount);
            const result = await service.getAccountById('acc-1');
            expect(result?.email).toBe('test@example.com');
        });
    });

    // ===== updateProfile =====
    describe('updateProfile', () => {
        it('should throw for nonexistent account', async () => {
            await expect(service.updateProfile('unknown', { displayName: 'new' }))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should update display name', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount });
            const result = await service.updateProfile('acc-1', { displayName: '新名字' });
            expect(result.displayName).toBe('新名字');
            expect(accountRepo.save).toHaveBeenCalled();
        });
    });

    // ===== hasPassword =====
    describe('hasPassword', () => {
        it('should return false for empty hash', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1', passwordHash: '' });
            const result = await service.hasPassword('acc-1');
            expect(result.hasPassword).toBe(false);
        });

        it('should return true for set password', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'acc-1', passwordHash: '$2a$10$hash' });
            const result = await service.hasPassword('acc-1');
            expect(result.hasPassword).toBe(true);
        });
    });

    // ===== changePassword =====
    describe('changePassword', () => {
        it('should throw for wrong current password', async () => {
            const hash = await bcrypt.hash('correct', 10);
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, passwordHash: hash });
            await expect(service.changePassword('acc-1', 'wrong', 'newpass'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should change password with correct current password', async () => {
            const hash = await bcrypt.hash('current123', 10);
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, passwordHash: hash });
            const result = await service.changePassword('acc-1', 'current123', 'new456');
            expect(result.success).toBe(true);
            expect(accountRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ passwordHash: expect.not.stringContaining('current123') }),
            );
        });
    });

    // ===== setPassword =====
    describe('setPassword', () => {
        it('should set password for OAuth account without password', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, passwordHash: '' });
            const result = await service.setPassword('acc-1', 'newpass');
            expect(result.success).toBe(true);
        });

        it('should reject if password already set', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, passwordHash: '$2a$10$hash' });
            await expect(service.setPassword('acc-1', 'newpass'))
                .rejects.toThrow(BadRequestException);
        });
    });

    // ===== adminSetPassword =====
    describe('adminSetPassword', () => {
        it('should throw for nonexistent email', async () => {
            await expect(service.adminSetPassword('no@test.com', 'pass'))
                .rejects.toThrow(NotFoundException);
        });

        it('should set password by email', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount });
            const result = await service.adminSetPassword('test@example.com', 'admin-reset');
            expect(result.success).toBe(true);
        });
    });

    // ===== recreateOwnerAccount =====
    describe('recreateOwnerAccount', () => {
        it('should throw if owner role missing', async () => {
            accountRepo.findOne.mockResolvedValueOnce(null); // no existing
            roleRepo.findOne.mockResolvedValueOnce(null); // no owner role
            await expect(service.recreateOwnerAccount('owner@test.com', 'pass'))
                .rejects.toThrow(NotFoundException);
        });

        it('should recreate owner account', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ id: 'old' }); // existing
            roleRepo.findOne.mockResolvedValueOnce({ name: 'owner', level: 10 });
            const result = await service.recreateOwnerAccount('owner@test.com', 'newpass');
            expect(result.success).toBe(true);
            expect(accountRepo.delete).toHaveBeenCalledWith({ id: 'old' });
            expect(accountRepo.save).toHaveBeenCalled();
        });
    });

    // ===== updatePreferences =====
    describe('updatePreferences', () => {
        it('should update notification preferences', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount });
            const result = await service.updatePreferences('acc-1', {
                alertNotifications: false,
                trainingNotifications: true,
            });
            expect(result.alertNotifications).toBe(false);
            expect(result.trainingNotifications).toBe(true);
        });
    });

    // ===== getAccountStatus =====
    describe('getAccountStatus', () => {
        it('should return status with needsSetup flag', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount });
            const result = await service.getAccountStatus('acc-1');
            expect(result.approvalStatus).toBe('approved');
            expect(result.needsSetup).toBe(true); // approved but not completed
        });

        it('should show no setup needed when profile completed', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, volunteerProfileCompleted: true });
            const result = await service.getAccountStatus('acc-1');
            expect(result.needsSetup).toBe(false);
        });
    });

    // ===== markVolunteerProfileCompleted =====
    describe('markVolunteerProfileCompleted', () => {
        it('should mark profile as completed', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount });
            const result = await service.markVolunteerProfileCompleted('acc-1');
            expect(result.success).toBe(true);
            expect(accountRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ volunteerProfileCompleted: true }),
            );
        });
    });
});
