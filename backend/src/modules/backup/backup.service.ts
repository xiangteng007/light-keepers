import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupMetadata {
    id: string;
    filename: string;
    createdAt: Date;
    size: number;
    tables: string[];
    recordCount: number;
}

export interface BackupResult {
    success: boolean;
    metadata?: BackupMetadata;
    error?: string;
}

export interface RestoreResult {
    success: boolean;
    restoredTables?: string[];
    recordCount?: number;
    error?: string;
}

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);
    private readonly backupDir = process.env.BACKUP_DIR || './backups';

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {
        // 確保備份目錄存在
        this.ensureBackupDir();
    }

    private ensureBackupDir(): void {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // ===== 建立備份 =====

    async createBackup(tables?: string[]): Promise<BackupResult> {
        const backupId = this.generateBackupId();
        const filename = `backup_${backupId}.json`;
        const filepath = path.join(this.backupDir, filename);

        try {
            // 取得要備份的表格
            const allTables = await this.getTableNames();
            const targetTables = tables || allTables;

            const backupData: Record<string, any[]> = {};
            let totalRecords = 0;

            for (const table of targetTables) {
                if (!allTables.includes(table)) {
                    this.logger.warn(`Table ${table} does not exist, skipping`);
                    continue;
                }

                try {
                    const records = await this.dataSource.query(`SELECT * FROM "${table}"`);
                    backupData[table] = records;
                    totalRecords += records.length;
                    this.logger.log(`Backed up ${records.length} records from ${table}`);
                } catch (tableError) {
                    this.logger.error(`Error backing up table ${table}:`, tableError);
                }
            }

            // 寫入備份檔案
            const backupContent = JSON.stringify({
                metadata: {
                    id: backupId,
                    createdAt: new Date().toISOString(),
                    tables: Object.keys(backupData),
                    recordCount: totalRecords,
                },
                data: backupData,
            }, null, 2);

            fs.writeFileSync(filepath, backupContent, 'utf8');

            const stats = fs.statSync(filepath);

            const metadata: BackupMetadata = {
                id: backupId,
                filename,
                createdAt: new Date(),
                size: stats.size,
                tables: Object.keys(backupData),
                recordCount: totalRecords,
            };

            this.logger.log(`Backup created: ${filename} (${totalRecords} records)`);

            return { success: true, metadata };
        } catch (error) {
            this.logger.error('Backup failed:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    // ===== 還原備份 =====

    async restoreBackup(backupId: string, tables?: string[]): Promise<RestoreResult> {
        const filename = `backup_${backupId}.json`;
        const filepath = path.join(this.backupDir, filename);

        try {
            if (!fs.existsSync(filepath)) {
                return { success: false, error: `Backup file not found: ${filename}` };
            }

            const content = fs.readFileSync(filepath, 'utf8');
            const backup = JSON.parse(content);

            const restoredTables: string[] = [];
            let totalRecords = 0;

            for (const [table, records] of Object.entries(backup.data)) {
                // 如果指定了特定表格，只還原那些
                if (tables && !tables.includes(table)) {
                    continue;
                }

                const recordArray = records as any[];
                if (recordArray.length === 0) continue;

                try {
                    // 簡單的 UPSERT 邏輯（需要根據實際表格結構調整）
                    for (const record of recordArray) {
                        // 檢查是否有 id 欄位
                        if (record.id) {
                            const exists = await this.dataSource.query(
                                `SELECT 1 FROM "${table}" WHERE id = $1`,
                                [record.id]
                            );

                            if (exists.length > 0) {
                                // 更新現有記錄
                                const setClauses = Object.keys(record)
                                    .filter(k => k !== 'id')
                                    .map((k, i) => `"${k}" = $${i + 2}`)
                                    .join(', ');

                                if (setClauses) {
                                    await this.dataSource.query(
                                        `UPDATE "${table}" SET ${setClauses} WHERE id = $1`,
                                        [record.id, ...Object.values(record).filter((_, i) => Object.keys(record)[i] !== 'id')]
                                    );
                                }
                            } else {
                                // 插入新記錄
                                const columns = Object.keys(record).map(k => `"${k}"`).join(', ');
                                const placeholders = Object.keys(record).map((_, i) => `$${i + 1}`).join(', ');
                                await this.dataSource.query(
                                    `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
                                    Object.values(record)
                                );
                            }
                        }
                    }

                    restoredTables.push(table);
                    totalRecords += recordArray.length;
                    this.logger.log(`Restored ${recordArray.length} records to ${table}`);
                } catch (tableError) {
                    this.logger.error(`Error restoring table ${table}:`, tableError);
                }
            }

            this.logger.log(`Restore completed: ${totalRecords} records to ${restoredTables.length} tables`);

            return {
                success: true,
                restoredTables,
                recordCount: totalRecords,
            };
        } catch (error) {
            this.logger.error('Restore failed:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    // ===== 列出備份 =====

    async listBackups(): Promise<BackupMetadata[]> {
        const backups: BackupMetadata[] = [];

        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
                .sort()
                .reverse();

            for (const filename of files) {
                const filepath = path.join(this.backupDir, filename);
                const stats = fs.statSync(filepath);

                try {
                    const content = fs.readFileSync(filepath, 'utf8');
                    const backup = JSON.parse(content);

                    backups.push({
                        id: backup.metadata.id,
                        filename,
                        createdAt: new Date(backup.metadata.createdAt),
                        size: stats.size,
                        tables: backup.metadata.tables,
                        recordCount: backup.metadata.recordCount,
                    });
                } catch {
                    // 跳過無效的備份檔案
                }
            }
        } catch (error) {
            this.logger.error('Error listing backups:', error);
        }

        return backups;
    }

    // ===== 刪除備份 =====

    async deleteBackup(backupId: string): Promise<boolean> {
        const filename = `backup_${backupId}.json`;
        const filepath = path.join(this.backupDir, filename);

        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                this.logger.log(`Backup deleted: ${filename}`);
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error('Error deleting backup:', error);
            return false;
        }
    }

    // ===== 匯出單表資料為 CSV =====

    async exportTableToCSV(tableName: string): Promise<{ success: boolean; csv?: string; error?: string }> {
        try {
            const records = await this.dataSource.query(`SELECT * FROM "${tableName}" LIMIT 10000`);

            if (records.length === 0) {
                return { success: true, csv: '' };
            }

            const headers = Object.keys(records[0]);
            const rows = records.map((r: any) =>
                headers.map(h => {
                    const val = r[h];
                    if (val === null || val === undefined) return '';
                    if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
                    return String(val).replace(/"/g, '""');
                }).map(v => `"${v}"`).join(',')
            );

            const csv = [headers.join(','), ...rows].join('\n');
            return { success: true, csv };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    // ===== 輔助方法 =====

    private async getTableNames(): Promise<string[]> {
        const result = await this.dataSource.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        return result.map((r: any) => r.table_name);
    }

    private generateBackupId(): string {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            '_',
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0'),
        ].join('');
    }
}
