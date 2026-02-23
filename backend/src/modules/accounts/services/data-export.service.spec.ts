import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataExportService } from './data-export.service';
import { Account } from '../entities/account.entity';
import * as fs from 'fs';

describe('DataExportService', () => {
    let service: DataExportService;
    let accountRepo: { findOne: jest.Mock };

    const mockAccount = {
        id: 'acc-1',
        email: 'test@example.com',
        phone: '0912345678',
        displayName: '測試使用者',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-06-01'),
        avatarUrl: null,
        emailVerified: true,
        phoneVerified: false,
        prefAlertNotifications: true,
        prefTaskNotifications: true,
        prefTrainingNotifications: false,
        lineUserId: 'line-123',
        lineDisplayName: 'LINE測試',
        googleId: 'google-123',
        googleEmail: 'test@gmail.com',
        volunteer: null,
        roles: [{ name: 'volunteer', level: 2 }],
    };

    beforeEach(async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any);
        jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
        jest.spyOn(fs, 'copyFileSync').mockReturnValue(undefined);
        jest.spyOn(fs, 'unlinkSync').mockReturnValue(undefined);

        accountRepo = {
            findOne: jest.fn().mockResolvedValue(null),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataExportService,
                { provide: getRepositoryToken(Account), useValue: accountRepo },
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('./test-exports') } },
            ],
        }).compile();

        service = module.get<DataExportService>(DataExportService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== requestExport =====
    describe('requestExport', () => {
        it('should throw if account not found', async () => {
            await expect(service.requestExport('unknown'))
                .rejects.toThrow(BadRequestException);
        });

        it('should create export request with correct metadata', async () => {
            accountRepo.findOne.mockResolvedValueOnce(mockAccount);
            const result = await service.requestExport('acc-1', 'json');
            expect(result.id).toBeDefined();
            expect(result.accountId).toBe('acc-1');
            // Status may already be 'processing' or 'completed' due to fast async resolution
            expect(['pending', 'processing', 'completed']).toContain(result.status);
            expect(result.format).toBe('json');
        });

        it('should process export and write file', async () => {
            accountRepo.findOne.mockResolvedValueOnce(mockAccount);
            const req = await service.requestExport('acc-1', 'json');

            // Wait for async processExport to complete
            await new Promise(r => setTimeout(r, 50));

            const status = await service.getExportStatus(req.id, 'acc-1');
            expect(status.status).toBe('completed');
            expect(status.downloadUrl).toContain(req.id);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should support csv format', async () => {
            accountRepo.findOne.mockResolvedValueOnce(mockAccount);
            const req = await service.requestExport('acc-1', 'csv');
            expect(req.format).toBe('csv');

            await new Promise(r => setTimeout(r, 50));

            const status = await service.getExportStatus(req.id, 'acc-1');
            expect(status.status).toBe('completed');
        });
    });

    // ===== getExportStatus =====
    describe('getExportStatus', () => {
        it('should throw for unknown request ID', async () => {
            await expect(service.getExportStatus('unknown', 'acc-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw for wrong account', async () => {
            accountRepo.findOne.mockResolvedValueOnce(mockAccount);
            const req = await service.requestExport('acc-1');

            await expect(service.getExportStatus(req.id, 'other-account'))
                .rejects.toThrow(BadRequestException);
        });

        it('should return status for valid request', async () => {
            accountRepo.findOne.mockResolvedValueOnce(mockAccount);
            const req = await service.requestExport('acc-1');

            const status = await service.getExportStatus(req.id, 'acc-1');
            expect(status.id).toBe(req.id);
        });
    });

    // ===== getDownloadPath =====
    describe('getDownloadPath', () => {
        it('should return path for completed export', async () => {
            accountRepo.findOne.mockResolvedValueOnce(mockAccount);
            const req = await service.requestExport('acc-1', 'json');
            await new Promise(r => setTimeout(r, 50));

            const filePath = await service.getDownloadPath(req.id, 'acc-1');
            expect(filePath).toContain(req.id);
            expect(filePath).toContain('.json');
        });

        it('should throw for expired download', async () => {
            accountRepo.findOne.mockResolvedValueOnce(mockAccount);
            const req = await service.requestExport('acc-1', 'json');
            await new Promise(r => setTimeout(r, 50));

            // Manually expire the request
            const status = await service.getExportStatus(req.id, 'acc-1');
            (status as any).expiresAt = new Date(Date.now() - 1000);

            await expect(service.getDownloadPath(req.id, 'acc-1'))
                .rejects.toThrow(BadRequestException);
        });
    });

    // ===== cleanupExpiredExports =====
    describe('cleanupExpiredExports', () => {
        it('should return 0 when nothing to clean', async () => {
            const count = await service.cleanupExpiredExports();
            expect(count).toBe(0);
        });
    });
});
