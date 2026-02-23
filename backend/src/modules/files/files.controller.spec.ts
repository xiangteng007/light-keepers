import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FileStorageService } from './file-storage.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('FilesController', () => {
    let controller: FilesController;
    const mockUser = { uid: 'u1', id: 'u1' } as any;

    beforeEach(async () => {
        const service = {
            saveFile: jest.fn().mockResolvedValue({ path: 'uploads/test.jpg', size: 1024 }),
            getFile: jest.fn().mockReturnValue(Buffer.from('file data')),
            deleteFile: jest.fn().mockReturnValue(true),
            listFiles: jest.fn().mockReturnValue([]),
            getStorageStats: jest.fn().mockReturnValue({ totalSize: 1048576, fileCount: 10 }),
            cleanOldFiles: jest.fn().mockResolvedValue(3),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [FilesController],
            providers: [{ provide: FileStorageService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<FilesController>(FilesController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('uploadFile returns error when no file', async () => {
        const result = await controller.uploadFile(null, mockUser, 'uploads');
        expect(result).toEqual({ success: false, error: '請選擇檔案' });
    });

    it('uploadFile saves file successfully', async () => {
        const file = { buffer: Buffer.from('data'), originalname: 'test.jpg', mimetype: 'image/jpeg' };
        const result = await controller.uploadFile(file, mockUser, 'uploads');
        expect(result).toHaveProperty('success', true);
    });

    it('deleteFile deletes a file', async () => {
        const result = await controller.deleteFile('uploads/test.jpg');
        expect(result.success).toBe(true);
    });

    it('listFiles lists files in folder', async () => {
        const result = await controller.listFiles('uploads');
        expect(result.success).toBe(true);
    });

    it('getStats returns storage stats', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('totalSizeMB');
    });

    it('cleanOldFiles cleans old files', async () => {
        const result = await controller.cleanOldFiles('30');
        expect(result.success).toBe(true);
    });
});
