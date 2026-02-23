jest.mock('fs');
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: (...args: string[]) => args.join('/'),
    extname: (name: string) => name.includes('.') ? '.' + name.split('.').pop() : '',
}));

import * as fs from 'fs';
import { FileStorageService } from './file-storage.service';

describe('FileStorageService', () => {
    let service: FileStorageService;
    const configService = { get: jest.fn((key: string) => key === 'UPLOAD_DIR' ? './test-uploads' : 'http://localhost:3000') };

    beforeEach(() => {
        jest.clearAllMocks();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
        (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
        service = new FileStorageService(configService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('saveFile', () => {
        it('should save file and return StoredFile', async () => {
            const buf = Buffer.from('hello');
            const result = await service.saveFile(buf, 'test.png', 'image/png', 'user1');
            expect(result.originalName).toBe('test.png');
            expect(result.mimeType).toBe('image/png');
            expect(result.size).toBe(5);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should reject oversized files', async () => {
            const bigBuf = Buffer.alloc(20 * 1024 * 1024);
            await expect(service.saveFile(bigBuf, 'big.png', 'image/png')).rejects.toThrow('File too large');
        });

        it('should reject disallowed types', async () => {
            const buf = Buffer.from('data');
            await expect(service.saveFile(buf, 'test.exe', 'application/x-msdownload')).rejects.toThrow('File type not allowed');
        });
    });

    describe('getFile', () => {
        it('should return buffer when file exists', () => {
            const content = Buffer.from('contents');
            (fs.readFileSync as jest.Mock).mockReturnValue(content);
            const result = service.getFile('2026/01/test.png');
            expect(result).toEqual(content);
        });

        it('should return null when file not found', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            expect(service.getFile('missing.png')).toBeNull();
        });
    });

    describe('deleteFile', () => {
        it('should delete existing file', () => {
            (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
            expect(service.deleteFile('2026/01/test.png')).toBe(true);
        });

        it('should return false for non-existent file', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            expect(service.deleteFile('missing.png')).toBe(false);
        });
    });

    describe('listFiles', () => {
        it('should list files in folder', () => {
            (fs.readdirSync as jest.Mock).mockReturnValue(['a.png', 'b.pdf']);
            (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
            const files = service.listFiles('2026/01');
            expect(files).toEqual(['a.png', 'b.pdf']);
        });

        it('should return empty for non-existent folder', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            expect(service.listFiles('no-folder')).toEqual([]);
        });
    });

    describe('getStorageStats', () => {
        it('should return storage stats', () => {
            (fs.readdirSync as jest.Mock).mockReturnValue([]);
            const stats = service.getStorageStats();
            expect(stats).toHaveProperty('totalFiles');
            expect(stats).toHaveProperty('totalSize');
        });
    });
});
