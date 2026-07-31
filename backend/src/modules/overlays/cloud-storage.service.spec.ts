/**
 * cloud-storage.service.spec.ts
 *
 * INF-1 / M.3b：service 已改為注入 storage 抽象層。
 * 本 spec 鎖定「GCS 模式下對外行為不變」——bucket 綁定（GCS_MAP_PACKAGES_BUCKET）、
 * `packages/<id>.<ext>` 路徑組成、寫入 DB 的公開 URL，以及簽名下載 URL 的一小時效期。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CloudStorageService } from './cloud-storage.service';
import { MapPackage } from './entities/map-package.entity';
import { GcsStorageProvider } from '../../common/storage/gcs-storage.provider';
import { StorageModule } from '../../common/storage/storage.module';
import {
    MAP_PACKAGE_STORAGE,
    MAP_PACKAGE_STORAGE_FEATURE,
} from '../../common/storage/storage.tokens';
import type { StorageProvider } from '../../common/storage/storage.interface';

jest.mock('@google-cloud/storage', () => {
    const { PassThrough } = require('stream');

    const state = {
        requestedPaths: [] as string[],
        writeOptions: [] as any[],
        signedUrlConfigs: [] as any[],
        deleteOptions: [] as any[],
        listOptions: [] as any[],
        exists: true,
        listedNames: ['packages/p1.basemap', 'packages/p2.json'],
        metadata: {
            size: '4096',
            contentType: 'application/octet-stream',
            md5Hash: 'hash-1',
            updated: '2025-02-03T04:05:06.000Z',
            metadata: { packageId: 'p1', version: '1.0.0', type: 'basemap' },
        } as Record<string, unknown>,
    };

    const file = {
        createWriteStream: jest.fn((options: any) => {
            state.writeOptions.push(options);
            return new PassThrough();
        }),
        makePublic: jest.fn(async () => undefined),
        exists: jest.fn(async () => [state.exists]),
        getMetadata: jest.fn(async () => [state.metadata]),
        getSignedUrl: jest.fn(async (config: any) => {
            state.signedUrlConfigs.push(config);
            return ['https://storage.googleapis.com/signed-package-url'];
        }),
        delete: jest.fn(async (options: any) => {
            state.deleteOptions.push(options);
            return undefined;
        }),
    };

    const bucket: any = {
        name: '',
        file: jest.fn((path: string) => {
            state.requestedPaths.push(path);
            return file;
        }),
        getFiles: jest.fn(async (options: any) => {
            state.listOptions.push(options);
            return [
                state.listedNames.map((name: string) => ({ name, metadata: { size: '1' } })),
                null,
                {},
            ];
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

describe('CloudStorageService（GCS 模式行為對照）', () => {
    let service: CloudStorageService;
    let repo: { find: jest.Mock; findOne: jest.Mock; update: jest.Mock };

    beforeEach(async () => {
        gcs.requestedPaths.length = 0;
        gcs.writeOptions.length = 0;
        gcs.signedUrlConfigs.length = 0;
        gcs.deleteOptions.length = 0;
        gcs.listOptions.length = 0;
        gcs.exists = true;

        repo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({
                id: 'p1', type: 'basemap', name: 'Test', version: '1.0.0',
            }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        const provider = new GcsStorageProvider(
            makeConfig({ STORAGE_PROVIDER: 'gcs', GCS_MAP_PACKAGES_BUCKET: 'test-bucket' }),
            { bucket: 'test-bucket' },
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CloudStorageService,
                { provide: MAP_PACKAGE_STORAGE, useValue: provider },
                { provide: getRepositoryToken(MapPackage), useValue: repo },
            ],
        }).compile();
        service = module.get(CloudStorageService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('抽象層永遠提供 provider，isAvailable 為 true', () => {
        expect(service.isAvailable()).toBe(true);
    });

    describe('bucket 綁定', () => {
        it('forFeature 讀 GCS_MAP_PACKAGES_BUCKET，未設定時退回舊有預設值', () => {
            const build = (values: Record<string, string>): StorageProvider => {
                const dynamic = StorageModule.forFeature(MAP_PACKAGE_STORAGE_FEATURE);
                const factory = (dynamic.providers as any[])[0];
                return factory.useFactory(makeConfig(values));
            };

            expect(build({ STORAGE_PROVIDER: 'gcs', GCS_MAP_PACKAGES_BUCKET: 'custom' }).getContainerName())
                .toBe('custom');
            expect(build({ STORAGE_PROVIDER: 'gcs' }).getContainerName())
                .toBe('lightkeepers-map-packages');
            expect(MAP_PACKAGE_STORAGE_FEATURE.token).toBe(MAP_PACKAGE_STORAGE);
        });
    });

    describe('getSignedDownloadUrl', () => {
        it('路徑組成為 packages/<id>.<ext>，效期一小時', async () => {
            const before = Date.now();
            const url = await service.getSignedDownloadUrl('p1');

            expect(url).toBe('https://storage.googleapis.com/signed-package-url');
            expect(gcs.requestedPaths).toContain('packages/p1.basemap');
            expect(gcs.signedUrlConfigs[0].action).toBe('read');
            expect(gcs.signedUrlConfigs[0].expires).toBeGreaterThanOrEqual(before + 59 * 60 * 1000);
            expect(gcs.signedUrlConfigs[0].expires).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000);
        });

        it('style 型別存成 .json', async () => {
            repo.findOne.mockResolvedValue({ id: 'p9', type: 'style', name: 'S', version: '2' });

            await service.getSignedDownloadUrl('p9');

            expect(gcs.requestedPaths).toContain('packages/p9.json');
        });

        it('檔案不在 storage 時回 null', async () => {
            gcs.exists = false;
            expect(await service.getSignedDownloadUrl('p1')).toBeNull();
        });

        it('DB 查無此 package 時拋錯', async () => {
            repo.findOne.mockResolvedValue(null);
            await expect(service.getSignedDownloadUrl('nope')).rejects.toThrow('Package not found');
        });
    });

    describe('uploadPackage', () => {
        it('寫回 DB 的仍是 storage.googleapis.com 公開 URL', async () => {
            const result = await service.uploadPackage('p1', Buffer.from('map-bytes'), 'application/zip');

            expect(result.url).toBe('https://storage.googleapis.com/test-bucket/packages/p1.basemap');
            expect(result.size).toBe(9);
            expect(repo.update).toHaveBeenCalledWith('p1', {
                fileUrl: 'https://storage.googleapis.com/test-bucket/packages/p1.basemap',
                fileSize: 9,
            });
        });

        it('帶上 contentType 與 package 自訂 metadata', async () => {
            await service.uploadPackage('p1', Buffer.from('map-bytes'), 'application/zip');

            expect(gcs.writeOptions[0].contentType).toBe('application/zip');
            expect(gcs.writeOptions[0].metadata.metadata).toEqual({
                packageId: 'p1', version: '1.0.0', type: 'basemap',
            });
        });
    });

    describe('deletePackage', () => {
        it('檔案已不存在也不拋錯', async () => {
            await expect(service.deletePackage('p1')).resolves.toBeUndefined();
            expect(gcs.deleteOptions[0]).toEqual({ ignoreNotFound: true });
        });

        it('DB 查無此 package 時什麼都不做', async () => {
            repo.findOne.mockResolvedValue(null);
            await service.deletePackage('nope');
            expect(gcs.deleteOptions).toHaveLength(0);
        });
    });

    describe('listStoredPackages', () => {
        it('以 packages/ 為前綴列出檔名', async () => {
            expect(await service.listStoredPackages())
                .toEqual(['packages/p1.basemap', 'packages/p2.json']);
            expect(gcs.listOptions[0].prefix).toBe('packages/');
        });
    });

    describe('getPackageMetadata', () => {
        it('維持既有欄位形狀', async () => {
            expect(await service.getPackageMetadata('p1')).toEqual({
                size: 4096,
                contentType: 'application/octet-stream',
                md5Hash: 'hash-1',
                updated: '2025-02-03T04:05:06.000Z',
                customMetadata: { packageId: 'p1', version: '1.0.0', type: 'basemap' },
            });
        });

        it('DB 查無此 package 時回 null', async () => {
            repo.findOne.mockResolvedValue(null);
            expect(await service.getPackageMetadata('nope')).toBeNull();
        });
    });

    describe('syncMetadata', () => {
        it('沒有 package 時回 0', async () => {
            expect(await service.syncMetadata()).toBe(0);
        });

        it('把 storage 的實際大小寫回 DB', async () => {
            repo.find.mockResolvedValue([{ id: 'p1', type: 'basemap', name: 'T', version: '1' }]);

            expect(await service.syncMetadata()).toBe(1);
            expect(repo.update).toHaveBeenCalledWith('p1', { fileSize: 4096 });
        });
    });
});
