import { GcsStorageService } from './gcs-storage.service';

// Mock @google-cloud/storage
jest.mock('@google-cloud/storage', () => ({
    Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn().mockReturnValue({
            file: jest.fn().mockReturnValue({
                getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url']),
                exists: jest.fn().mockResolvedValue([true]),
                delete: jest.fn().mockResolvedValue(undefined),
                getMetadata: jest.fn().mockResolvedValue([{
                    size: '2048', contentType: 'image/jpeg', md5Hash: 'abc123',
                    timeCreated: '2025-01-01T00:00:00Z',
                }]),
            }),
        }),
    })),
}));

describe('GcsStorageService', () => {
    let service: GcsStorageService;
    const mockConfig = { get: jest.fn().mockReturnValue('test-bucket') };

    beforeEach(() => {
        service = new GcsStorageService(mockConfig as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getSignedUrl', () => {
        it('should generate write URL', async () => {
            const result = await service.getSignedUrl({
                bucket: 'test-bucket', path: 'test/file.jpg',
                contentType: 'image/jpeg', action: 'write',
            });
            expect(result.url).toContain('googleapis.com');
            expect(result.method).toBe('PUT');
        });

        it('should generate read URL', async () => {
            const result = await service.getSignedUrl({
                bucket: 'test-bucket', path: 'test/file.jpg',
                contentType: 'image/jpeg', action: 'read',
            });
            expect(result.method).toBe('GET');
        });
    });

    describe('generateUploadUrl', () => {
        it('should build correct path', async () => {
            const result = await service.generateUploadUrl('ms1', 'fr1', 'att1', 'image/jpeg');
            expect(result.path).toBe('reports/ms1/fr1/att1');
        });
    });

    describe('generateDownloadUrl', () => {
        it('should generate download URL', async () => {
            const result = await service.generateDownloadUrl('reports/ms1/fr1/att1');
            expect(result.method).toBe('GET');
        });
    });

    describe('fileExists', () => {
        it('should return true for existing file', async () => {
            expect(await service.fileExists('test.jpg')).toBe(true);
        });
    });

    describe('deleteFile', () => {
        it('should delete file', async () => {
            expect(await service.deleteFile('test.jpg')).toBe(true);
        });
    });

    describe('getFileMetadata', () => {
        it('should return metadata', async () => {
            const meta = await service.getFileMetadata('test.jpg');
            expect(meta?.size).toBe(2048);
            expect(meta?.contentType).toBe('image/jpeg');
        });
    });
});
