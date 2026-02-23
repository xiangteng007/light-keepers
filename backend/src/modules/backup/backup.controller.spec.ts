import { Test, TestingModule } from '@nestjs/testing';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('BackupController', () => {
    let controller: BackupController;
    let service: jest.Mocked<Partial<BackupService>>;

    const mockBackup = { id: 'b1', createdAt: new Date(), tables: ['accounts'] };

    beforeEach(async () => {
        service = {
            listBackups: jest.fn().mockResolvedValue([mockBackup]),
            createBackup: jest.fn().mockResolvedValue({ success: true, metadata: mockBackup }),
            restoreBackup: jest.fn().mockResolvedValue({ success: true, recordCount: 100, restoredTables: ['accounts'] }),
            deleteBackup: jest.fn().mockResolvedValue(true),
            exportTableToCSV: jest.fn().mockResolvedValue({ success: true, csv: 'id,name\n1,test' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BackupController],
            providers: [{ provide: BackupService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<BackupController>(BackupController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('listBackups returns backup list', async () => {
        const result = await controller.listBackups();
        expect(result.success).toBe(true);
        expect(result.count).toBe(1);
    });

    it('createBackup creates backup', async () => {
        const result = await controller.createBackup({ tables: ['accounts'] });
        expect(result.success).toBe(true);
        expect(result.message).toContain('成功');
    });

    it('restoreBackup restores backup', async () => {
        const result = await controller.restoreBackup('b1', { tables: ['accounts'] });
        expect(result.success).toBe(true);
        expect(result.data.recordCount).toBe(100);
    });

    it('deleteBackup deletes backup', async () => {
        const result = await controller.deleteBackup('b1');
        expect(result.success).toBe(true);
        expect(result.message).toContain('刪除');
    });
});
