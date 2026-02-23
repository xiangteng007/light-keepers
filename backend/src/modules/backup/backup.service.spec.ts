import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BackupService } from './backup.service';
import * as fs from 'fs';

jest.mock('fs');

describe('BackupService', () => {
    let service: BackupService;
    let dataSource: any;
    const mockedFs = fs as jest.Mocked<typeof fs>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BackupService,
                {
                    provide: getDataSourceToken(),
                    useValue: {
                        query: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<BackupService>(BackupService);
        dataSource = module.get(getDataSourceToken());

        // Default: backup dir exists
        mockedFs.existsSync = jest.fn().mockReturnValue(true);
        mockedFs.mkdirSync = jest.fn();
        mockedFs.writeFileSync = jest.fn();
        mockedFs.readFileSync = jest.fn();
        mockedFs.unlinkSync = jest.fn();
        mockedFs.readdirSync = jest.fn().mockReturnValue([]);
        jest.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Create Backup =====
    describe('createBackup', () => {
        it('should create backup of all tables', async () => {
            // getTableNames returns table list
            dataSource.query
                .mockResolvedValueOnce([{ table_name: 'accounts' }, { table_name: 'tasks' }]) // getTableNames
                .mockResolvedValueOnce([{ id: '1', name: 'test' }]) // SELECT * FROM accounts
                .mockResolvedValueOnce([{ id: '2', title: 'task1' }]); // SELECT * FROM tasks

            const result = await service.createBackup();
            expect(result.success).toBe(true);
            expect(result.metadata).toBeDefined();
            expect(result.metadata!.tables).toContain('accounts');
            expect(result.metadata!.recordCount).toBe(2);
            expect(mockedFs.writeFileSync).toHaveBeenCalled();
        });

        it('should create backup of specific tables', async () => {
            dataSource.query
                .mockResolvedValueOnce([{ table_name: 'accounts' }, { table_name: 'tasks' }]) // getTableNames
                .mockResolvedValueOnce([{ id: '1' }]); // SELECT * FROM accounts

            const result = await service.createBackup(['accounts']);
            expect(result.success).toBe(true);
            expect(result.metadata!.tables).toEqual(['accounts']);
        });

        it('should return error on failure', async () => {
            dataSource.query.mockRejectedValueOnce(new Error('DB error'));
            const result = await service.createBackup();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    // ===== Restore Backup =====
    describe('restoreBackup', () => {
        it('should restore from backup file', async () => {
            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                metadata: { id: 'bk-1', tables: ['accounts'], recordCount: 1 },
                data: { accounts: [{ id: '1', name: 'test' }] },
            }));
            dataSource.query.mockResolvedValue(undefined);

            const result = await service.restoreBackup('bk-1');
            expect(result.success).toBe(true);
        });

        it('should return error if backup file not found', async () => {
            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            const result = await service.restoreBackup('nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    // ===== List Backups =====
    describe('listBackups', () => {
        it('should list backup files', async () => {
            mockedFs.readdirSync = jest.fn().mockReturnValue(['backup_bk1.json', 'backup_bk2.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                metadata: { id: 'bk1', createdAt: new Date().toISOString(), tables: ['t1'], recordCount: 5 },
            }));

            const result = await service.listBackups();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    // ===== Delete Backup =====
    describe('deleteBackup', () => {
        it('should delete backup file', async () => {
            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            const result = await service.deleteBackup('bk-1');
            expect(result).toBe(true);
            expect(mockedFs.unlinkSync).toHaveBeenCalled();
        });

        it('should return false if file not found', async () => {
            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            const result = await service.deleteBackup('nonexistent');
            expect(result).toBe(false);
        });
    });

    // ===== Export CSV =====
    describe('exportTableToCSV', () => {
        it('should export table to CSV format', async () => {
            dataSource.query.mockResolvedValueOnce([
                { id: '1', name: 'test' },
                { id: '2', name: 'test2' },
            ]);
            const result = await service.exportTableToCSV('accounts');
            expect(result.success).toBe(true);
            expect(result.csv).toBeDefined();
            expect(result.csv).toContain('id');
        });
    });

});
