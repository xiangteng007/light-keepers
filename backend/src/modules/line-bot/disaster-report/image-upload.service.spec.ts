import { ImageUploadService } from './image-upload.service';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

jest.mock('@google-cloud/storage', () => ({
    Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn().mockReturnValue({
            file: jest.fn().mockReturnValue({
                save: jest.fn().mockResolvedValue(undefined),
                makePublic: jest.fn().mockResolvedValue(undefined),
                delete: jest.fn().mockResolvedValue(undefined),
                getSignedUrl: jest.fn().mockResolvedValue(['https://signed.url']),
            }),
        }),
    })),
}));

describe('ImageUploadService', () => {
    let service: ImageUploadService;
    let configService: { get: jest.Mock };

    beforeEach(() => {
        configService = { get: jest.fn().mockReturnValue('test-bucket') };
        service = new ImageUploadService(configService as any);
        mockFetch.mockReset();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('isAvailable', () => {
        it('should return true when storage configured', () => {
            expect(service.isAvailable()).toBe(true);
        });
    });

    describe('uploadFromLine', () => {
        it('should download from LINE and upload to GCS', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            });
            const url = await service.uploadFromLine('msg-1', 'user-1', 'token');
            expect(url).toContain('storage.googleapis.com');
        });
    });

    describe('deleteImage', () => {
        it('should delete GCS image', async () => {
            const result = await service.deleteImage('https://storage.googleapis.com/test-bucket/reports/user-1/file.jpg');
            expect(result).toBe(true);
        });

        it('should return false for non-GCS URL', async () => {
            const result = await service.deleteImage('https://other-site.com/img.jpg');
            expect(result).toBe(false);
        });
    });

    describe('generateSignedUrl', () => {
        it('should generate signed URL', async () => {
            const url = await service.generateSignedUrl('reports/user-1/file.jpg');
            expect(url).toBe('https://signed.url');
        });
    });
});
