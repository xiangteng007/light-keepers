/**
 * image-upload.service.spec.ts
 *
 * INF-1 / M.3b：service 已改為注入 storage 抽象層。
 * 本 spec 鎖定「GCS 模式下對外行為不變」——bucket 綁定（GCS_BUCKET_NAME）、
 * `reports/<lineUserId>/<ts>_<rand>.jpg` 路徑組成、makePublic 後回傳的
 * `storage.googleapis.com/<bucket>/<path>` 公開 URL，以及刪除時的 URL 前綴比對。
 */
import { ConfigService } from '@nestjs/config';
import { ImageUploadService } from './image-upload.service';
import { GcsStorageProvider } from '../../../common/storage/gcs-storage.provider';
import { StorageModule } from '../../../common/storage/storage.module';
import {
    DISASTER_REPORT_IMAGE_STORAGE,
    DISASTER_REPORT_IMAGE_STORAGE_FEATURE,
} from '../../../common/storage/storage.tokens';
import type { StorageProvider } from '../../../common/storage/storage.interface';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

jest.mock('@google-cloud/storage', () => {
    const { PassThrough } = require('stream');

    const state = {
        requestedPaths: [] as string[],
        writtenChunks: [] as Buffer[],
        writeOptions: [] as any[],
        signedUrlConfigs: [] as any[],
        deleteOptions: [] as any[],
        madePublic: 0,
        writeError: null as Error | null,
        deleteError: null as Error | null,
        metadata: { size: '8', contentType: 'image/jpeg', etag: 'etag-1' } as Record<string, unknown>,
    };

    const file = {
        createWriteStream: jest.fn((options: any) => {
            state.writeOptions.push(options);
            const stream = new PassThrough();
            stream.on('data', (chunk: Buffer) => state.writtenChunks.push(chunk));
            if (state.writeError) {
                process.nextTick(() => stream.emit('error', state.writeError));
            }
            return stream;
        }),
        makePublic: jest.fn(async () => {
            state.madePublic += 1;
        }),
        getMetadata: jest.fn(async () => [state.metadata]),
        getSignedUrl: jest.fn(async (config: any) => {
            state.signedUrlConfigs.push(config);
            return ['https://signed.url'];
        }),
        delete: jest.fn(async (options: any) => {
            state.deleteOptions.push(options);
            if (state.deleteError) throw state.deleteError;
            return undefined;
        }),
    };

    const bucket: any = {
        name: '',
        file: jest.fn((path: string) => {
            state.requestedPaths.push(path);
            return file;
        }),
    };

    const Storage = jest.fn().mockImplementation(() => ({
        bucket: jest.fn((name: string) => {
            bucket.name = name;
            return bucket;
        }),
    }));

    return { Storage, __state: state };
});

const { __state: gcs } = jest.requireMock('@google-cloud/storage');

const makeConfig = (values: Record<string, string>): ConfigService =>
    ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('ImageUploadService（GCS 模式行為對照）', () => {
    let service: ImageUploadService;

    beforeEach(() => {
        gcs.requestedPaths.length = 0;
        gcs.writtenChunks.length = 0;
        gcs.writeOptions.length = 0;
        gcs.signedUrlConfigs.length = 0;
        gcs.deleteOptions.length = 0;
        gcs.madePublic = 0;
        gcs.writeError = null;
        gcs.deleteError = null;

        const provider = new GcsStorageProvider(
            makeConfig({ STORAGE_PROVIDER: 'gcs', GCS_BUCKET_NAME: 'test-bucket' }),
            { bucket: 'test-bucket' },
        );
        service = new ImageUploadService(provider);
        mockFetch.mockReset();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('isAvailable', () => {
        it('should return true when storage configured', () => {
            expect(service.isAvailable()).toBe(true);
        });
    });

    describe('bucket 綁定', () => {
        it('forFeature 讀 GCS_BUCKET_NAME，未設定時退回舊有預設值', () => {
            const build = (values: Record<string, string>): StorageProvider => {
                const dynamic = StorageModule.forFeature(DISASTER_REPORT_IMAGE_STORAGE_FEATURE);
                const factory = (dynamic.providers as any[])[0];
                return factory.useFactory(makeConfig(values));
            };

            expect(build({ STORAGE_PROVIDER: 'gcs', GCS_BUCKET_NAME: 'custom' }).getContainerName())
                .toBe('custom');
            expect(build({ STORAGE_PROVIDER: 'gcs' }).getContainerName())
                .toBe('light-keepers-reports');
            expect(DISASTER_REPORT_IMAGE_STORAGE_FEATURE.token).toBe(DISASTER_REPORT_IMAGE_STORAGE);
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

        it('路徑組成與公開 URL 不變', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            });

            const url = await service.uploadFromLine('msg-1', 'user-1', 'token');
            const storedPath = gcs.requestedPaths[0];

            expect(storedPath).toMatch(/^reports\/user-1\/\d+_[0-9a-f]{8}\.jpg$/);
            expect(url).toBe(`https://storage.googleapis.com/test-bucket/${storedPath}`);
        });

        it('設定 image/jpeg 與 LINE 來源自訂 metadata，並 makePublic', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            });

            await service.uploadFromLine('msg-1', 'user-1', 'token');

            expect(gcs.writeOptions[0].contentType).toBe('image/jpeg');
            expect(gcs.writeOptions[0].metadata.metadata).toMatchObject({
                lineMessageId: 'msg-1',
                lineUserId: 'user-1',
            });
            expect(gcs.madePublic).toBe(1);
        });

        it('上傳失敗時回退到 LINE content URL', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            });
            gcs.writeError = new Error('bucket unreachable');

            const url = await service.uploadFromLine('msg-1', 'user-1', 'token');

            expect(url).toBe('https://api-data.line.me/v2/bot/message/msg-1/content');
        });

        it('LINE 下載失敗時直接拋錯（不吞掉）', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Forbidden' });

            await expect(service.uploadFromLine('msg-1', 'user-1', 'token'))
                .rejects.toThrow('Failed to download image from LINE');
        });
    });

    describe('deleteImage', () => {
        it('should delete GCS image', async () => {
            const result = await service.deleteImage('https://storage.googleapis.com/test-bucket/reports/user-1/file.jpg');
            expect(result).toBe(true);
            expect(gcs.requestedPaths).toContain('reports/user-1/file.jpg');
        });

        it('should return false for non-GCS URL', async () => {
            const result = await service.deleteImage('https://other-site.com/img.jpg');
            expect(result).toBe(false);
        });

        it('別的 bucket 的 URL 不會被刪', async () => {
            const result = await service.deleteImage('https://storage.googleapis.com/other-bucket/x.jpg');
            expect(result).toBe(false);
        });

        it('檔案不存在時回 false', async () => {
            gcs.deleteError = new Error('No such object');

            const result = await service.deleteImage('https://storage.googleapis.com/test-bucket/gone.jpg');

            expect(result).toBe(false);
            expect(gcs.deleteOptions[0]).toEqual({ ignoreNotFound: false });
        });
    });

    describe('generateSignedUrl', () => {
        it('should generate signed URL', async () => {
            const url = await service.generateSignedUrl('reports/user-1/file.jpg');
            expect(url).toBe('https://signed.url');
        });

        it('預設 60 分鐘有效、read 動作、不指定簽章版本（沿用 SDK 預設）', async () => {
            const before = Date.now();
            await service.generateSignedUrl('reports/user-1/file.jpg');
            const config = gcs.signedUrlConfigs[0];

            expect(config.action).toBe('read');
            expect(config).not.toHaveProperty('version');
            expect(config).not.toHaveProperty('contentType');
            expect(config.expires).toBeGreaterThanOrEqual(before + 59 * 60 * 1000);
            expect(config.expires).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000);
        });
    });
});
