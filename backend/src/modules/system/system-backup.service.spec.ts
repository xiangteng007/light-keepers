jest.mock('fs');

import * as fs from 'fs';
import { SystemBackupService } from './system-backup.service';

describe('SystemBackupService', () => {
    let service: SystemBackupService;
    let dataSource: Record<string, jest.Mock>;
    let configService: Record<string, jest.Mock>;

    beforeEach(() => {
        jest.clearAllMocks();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
        (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
        (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });
        (fs.readdirSync as jest.Mock).mockReturnValue([]);

        dataSource = {
            query: jest.fn().mockResolvedValue([]),
        };
        configService = {
            get: jest.fn().mockReturnValue('./test-backups'),
        };
        service = new SystemBackupService(dataSource as any, configService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createBackup', () => {
        it('should create backup successfully', async () => {
            dataSource.query.mockResolvedValueOnce([{ table_name: 'accounts' }]); // getTableNames
            dataSource.query.mockResolvedValueOnce([{ id: '1', name: 'test' }]); // SELECT * FROM accounts
            const result = await service.createBackup();
            expect(result.success).toBe(true);
            expect(result.backup).toBeDefined();
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should create backup for specific tables', async () => {
            dataSource.query.mockResolvedValue([{ id: '1' }]);
            const result = await service.createBackup(['accounts']);
            expect(result.success).toBe(true);
        });
    });

    describe('listBackups', () => {
        it('should return empty list when no backups', async () => {
            const list = await service.listBackups();
            expect(list).toEqual([]);
        });

        it('should list existing backups', async () => {
            (fs.readdirSync as jest.Mock).mockReturnValue(['backup-001.json']);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
                createdAt: new Date().toISOString(), tables: ['accounts'], data: { accounts: [{ id: '1' }] },
            }));
            const list = await service.listBackups();
            expect(list).toHaveLength(1);
        });
    });

    describe('restoreBackup', () => {
        it('should return error for missing backup', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const result = await service.restoreBackup('nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('deleteBackup', () => {
        it('should delete existing backup', async () => {
            (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
            const result = await service.deleteBackup('backup-001');
            expect(result).toBe(true);
        });

        it('should return false for missing backup', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const result = await service.deleteBackup('nonexistent');
            expect(result).toBe(false);
        });
    });
});
