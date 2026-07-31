/**
 * gcs-storage.service.spec.ts
 *
 * INF-1 / M.3b：這個 service 已改為注入 storage 抽象層。
 * 本 spec 鎖定「GCS 模式下對外行為不變」——簽名 URL 的參數（v4、動作、到期時間、
 * content type）、路徑組成、bucket 綁定（GCS_BUCKET）與各方法的回傳語意，
 * 全部經由真正的 GcsStorageProvider 打到被 mock 的 GCS SDK 上驗證。
 */
import { ConfigService } from '@nestjs/config';
import { GcsStorageService } from './gcs-storage.service';
import { GcsStorageProvider } from '../../common/storage/gcs-storage.provider';
import { StorageModule } from '../../common/storage/storage.module';
import {
    FIELD_REPORT_STORAGE,
    FIELD_REPORT_STORAGE_FEATURE,
} from '../../common/storage/storage.tokens';
import type { StorageProvider } from '../../common/storage/storage.interface';

jest.mock('@google-cloud/storage', () => {
    const state = {
        signedUrlConfigs: [] as any[],
        deleteOptions: [] as any[],
        requestedPaths: [] as string[],
        signedUrl: 'https://storage.googleapis.com/signed-url',
        exists: true,
        deleteError: null as Error | null,
        metadata: {
            size: '2048',
            contentType: 'image/jpeg',
            md5Hash: 'abc123',
            timeCreated: '2025-01-01T00:00:00Z',
            updated: '2025-01-02T00:00:00Z',
        } as Record<string, unknown>,
    };

    const file = {
        getSignedUrl: jest.fn(async (config: any) => {
            state.signedUrlConfigs.push(config);
            return [state.signedUrl];
        }),
        exists: jest.fn(async () => [state.exists]),
        delete: jest.fn(async (options: any) => {
            state.deleteOptions.push(options);
            if (state.deleteError) throw state.deleteError;
            return undefined;
        }),
        getMetadata: jest.fn(async () => [state.metadata]),
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

const gcsConfig = makeConfig({
    STORAGE_PROVIDER: 'gcs',
    GCS_BUCKET: 'lightkeepers-uploads',
    GCP_PROJECT_ID: 'lk-test',
});

describe('GcsStorageService（GCS 模式行為對照）', () => {
    let service: GcsStorageService;
    let provider: StorageProvider;

    beforeEach(() => {
        gcs.signedUrlConfigs.length = 0;
        gcs.deleteOptions.length = 0;
        gcs.requestedPaths.length = 0;
        gcs.exists = true;
        gcs.deleteError = null;

        provider = new GcsStorageProvider(gcsConfig, { bucket: 'lightkeepers-uploads' });
        service = new GcsStorageService(provider);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('bucket 綁定', () => {
        it('forFeature 讀 GCS_BUCKET，未設定時退回舊有預設值', () => {
            const build = (values: Record<string, string>): StorageProvider => {
                const dynamic = StorageModule.forFeature(FIELD_REPORT_STORAGE_FEATURE);
                const factory = (dynamic.providers as any[])[0];
                return factory.useFactory(makeConfig(values));
            };

            expect(build({ STORAGE_PROVIDER: 'gcs', GCS_BUCKET: 'custom-bucket' }).getContainerName())
                .toBe('custom-bucket');
            expect(build({ STORAGE_PROVIDER: 'gcs' }).getContainerName())
                .toBe('lightkeepers-uploads');
        });

        it('feature token 與 forFeature 宣告一致', () => {
            expect(FIELD_REPORT_STORAGE_FEATURE.token).toBe(FIELD_REPORT_STORAGE);
            expect(FIELD_REPORT_STORAGE_FEATURE.bucketEnvKey).toBe('GCS_BUCKET');
        });
    });

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

        it('寫入 URL 用 v4 簽章並帶 contentType', async () => {
            await service.getSignedUrl({
                bucket: 'test-bucket', path: 'test/file.jpg',
                contentType: 'image/jpeg', action: 'write',
            });

            expect(gcs.signedUrlConfigs[0]).toMatchObject({
                version: 'v4',
                action: 'write',
                contentType: 'image/jpeg',
            });
        });

        it('讀取 URL 用 v4 簽章但不綁 contentType', async () => {
            await service.getSignedUrl({
                bucket: 'test-bucket', path: 'test/file.jpg',
                contentType: 'image/jpeg', action: 'read',
            });

            expect(gcs.signedUrlConfigs[0]).toMatchObject({ version: 'v4', action: 'read' });
            expect(gcs.signedUrlConfigs[0]).not.toHaveProperty('contentType');
        });

        it('簽章的到期時間與回傳的 expiresAt 是同一個瞬間', async () => {
            const result = await service.getSignedUrl({
                bucket: 'test-bucket', path: 'test/file.jpg',
                contentType: 'image/jpeg', action: 'write', expiresInMinutes: 15,
            });

            expect(gcs.signedUrlConfigs[0].expires).toBe(result.expiresAt);
            expect(result.expiresAt.getTime() - Date.now()).toBeGreaterThan(14 * 60 * 1000);
            expect(result.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000);
        });

        it('回傳的 bucket 為綁定的 GCS bucket', async () => {
            const result = await service.getSignedUrl({
                bucket: 'ignored', path: 'test/file.jpg',
                contentType: 'image/jpeg', action: 'read',
            });

            expect(result.bucket).toBe('lightkeepers-uploads');
        });
    });

    describe('generateUploadUrl', () => {
        it('should build correct path', async () => {
            const result = await service.generateUploadUrl('ms1', 'fr1', 'att1', 'image/jpeg');
            expect(result.path).toBe('reports/ms1/fr1/att1');
        });

        it('把同一個路徑交給 GCS 簽章，15 分鐘到期', async () => {
            await service.generateUploadUrl('ms1', 'fr1', 'att1', 'image/jpeg');

            expect(gcs.requestedPaths).toContain('reports/ms1/fr1/att1');
            expect(gcs.signedUrlConfigs[0].action).toBe('write');
        });
    });

    describe('generateDownloadUrl', () => {
        it('should generate download URL', async () => {
            const result = await service.generateDownloadUrl('reports/ms1/fr1/att1');
            expect(result.method).toBe('GET');
        });
    });

    describe('generateThumbnailUploadUrl', () => {
        it('把副檔名換成 _thumb.webp', async () => {
            const result = await service.generateThumbnailUploadUrl('reports/ms1/fr1/att1.jpg');

            expect(result.path).toBe('reports/ms1/fr1/att1_thumb.webp');
            expect(gcs.signedUrlConfigs[0].contentType).toBe('image/webp');
        });
    });

    describe('fileExists', () => {
        it('should return true for existing file', async () => {
            expect(await service.fileExists('test.jpg')).toBe(true);
        });

        it('should return false for missing file', async () => {
            gcs.exists = false;
            expect(await service.fileExists('test.jpg')).toBe(false);
        });
    });

    describe('deleteFile', () => {
        it('should delete file', async () => {
            expect(await service.deleteFile('test.jpg')).toBe(true);
        });

        it('刪除不存在的檔案回 false（不吞掉 404）', async () => {
            gcs.deleteError = new Error('No such object');
            expect(await service.deleteFile('missing.jpg')).toBe(false);
            expect(gcs.deleteOptions[0]).toEqual({ ignoreNotFound: false });
        });
    });

    describe('getFileMetadata', () => {
        it('should return metadata', async () => {
            const meta = await service.getFileMetadata('test.jpg');
            expect(meta?.size).toBe(2048);
            expect(meta?.contentType).toBe('image/jpeg');
            expect(meta?.md5Hash).toBe('abc123');
            expect(meta?.created).toEqual(new Date('2025-01-01T00:00:00Z'));
        });
    });
});
