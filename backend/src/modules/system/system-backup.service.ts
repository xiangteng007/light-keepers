/**
 * System Backup Service
 * Handles data backup and restore operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupInfo {
    id: string;
    filename: string;
    createdAt: Date;
    sizeBytes: number;
    tables: string[];
    recordCount: number;
}

export interface BackupResult {
    success: boolean;
    backup?: BackupInfo;
    error?: string;
}

@Injectable()
export class SystemBackupService {
    private readonly logger = new Logger(SystemBackupService.name);
    private readonly backupDir: string;

    constructor(
        private dataSource: DataSource,
        private configService: ConfigService,
    ) {
        this.backupDir = this.configService.get<string>('BACKUP_DIR') || './backups';
        this.ensureBackupDir();
    }

    /**
     * Create a backup of specified tables
     */
    async createBackup(tables?: string[]): Promise<BackupResult> {
        const backupId = `backup-${Date.now()}`;
        const filename = `${backupId}.json`;
        const filepath = path.join(this.backupDir, filename);

        try {
            const allTables = tables || await this.getTableNames();
            const data: Record<string, any[]> = {};
            let totalRecords = 0;

            for (const table of allTables) {
                try {
                    const records = await this.dataSource.query(`SELECT * FROM "${table}"`);
                    data[table] = records;
                    totalRecords += records.length;
                } catch (error) {
                    this.logger.warn(`Skipping table ${table}: ${(error as Error).message}`);
                }
            }

            const backupData = {
                version: '1.0',
                createdAt: new Date().toISOString(),
                tables: Object.keys(data),
                data,
            };

            fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');
            const stats = fs.statSync(filepath);

            const backupInfo: BackupInfo = {
                id: backupId,
                filename,
                createdAt: new Date(),
                sizeBytes: stats.size,
                tables: Object.keys(data),
                recordCount: totalRecords,
            };

            this.logger.log(`Backup created: ${filename} (${totalRecords} records)`);
            return { success: true, backup: backupInfo };
        } catch (error) {
            this.logger.error('Backup failed', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * List available backups
     */
    async listBackups(): Promise<BackupInfo[]> {
        this.ensureBackupDir();

        const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json'));
        const backups: BackupInfo[] = [];

        for (const filename of files) {
            try {
                const filepath = path.join(this.backupDir, filename);
                const stats = fs.statSync(filepath);
                const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

                backups.push({
                    id: filename.replace('.json', ''),
                    filename,
                    createdAt: new Date(content.createdAt || stats.mtime),
                    sizeBytes: stats.size,
                    tables: content.tables || [],
                    recordCount: (Object.values(content.data || {}) as any[]).reduce((sum: number, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
                });
            } catch (error) {
                this.logger.warn(`Failed to read backup ${filename}`);
            }
        }

        return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Restore from a backup
     */
    async restoreBackup(backupId: string, tables?: string[]): Promise<{ success: boolean; restored: number; error?: string }> {
        const filename = backupId.endsWith('.json') ? backupId : `${backupId}.json`;
        const filepath = path.join(this.backupDir, filename);

        if (!fs.existsSync(filepath)) {
            return { success: false, restored: 0, error: 'Backup file not found' };
        }

        try {
            const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            const tablesToRestore = tables || Object.keys(content.data);
            let restored = 0;

            for (const table of tablesToRestore) {
                if (!content.data[table]) continue;

                const records = content.data[table];
                if (records.length === 0) continue;

                // Clear existing data
                await this.dataSource.query(`DELETE FROM "${table}"`);

                // Insert records in batches
                const batchSize = 100;
                for (let i = 0; i < records.length; i += batchSize) {
                    const batch = records.slice(i, i + batchSize);
                    for (const record of batch) {
                        const keys = Object.keys(record);
                        const values = keys.map(k => record[k]);
                        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');

                        try {
                            await this.dataSource.query(
                                `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`,
                                values
                            );
                            restored++;
                        } catch (error) {
                            this.logger.warn(`Failed to restore record in ${table}`);
                        }
                    }
                }
            }

            this.logger.log(`Restored ${restored} records from backup ${backupId}`);
            return { success: true, restored };
        } catch (error) {
            this.logger.error('Restore failed', error);
            return { success: false, restored: 0, error: (error as Error).message };
        }
    }

    /**
     * Delete a backup
     */
    async deleteBackup(backupId: string): Promise<boolean> {
        const filename = backupId.endsWith('.json') ? backupId : `${backupId}.json`;
        const filepath = path.join(this.backupDir, filename);

        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                this.logger.log(`Deleted backup: ${filename}`);
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to delete backup ${filename}`, error);
            return false;
        }
    }

    // ==================== Private Methods ====================

    private ensureBackupDir(): void {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    private async getTableNames(): Promise<string[]> {
        const result = await this.dataSource.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        return result.map((r: any) => r.table_name).filter((t: string) => !t.startsWith('typeorm_'));
    }
}
