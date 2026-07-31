/**
 * cloud-storage.service.local.spec.ts
 *
 * INF-1 / M.3b：`STORAGE_PROVIDER=local`（NAS 搬遷後的實際組態）下的完整流程。
 * 圖層／離線地圖包在 NAS 上落在同一個 uploads 樹的 `packages/` 底下，
 * 由 nginx 的 /uploads/ location 出檔。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { CloudStorageService } from './cloud-storage.service';
import { MapPackage } from './entities/map-package.entity';
import { LocalStorageProvider } from '../../common/storage/local-storage.provider';
import { StorageModule } from '../../common/storage/storage.module';
import {
    MAP_PACKAGE_STORAGE,
    MAP_PACKAGE_STORAGE_FEATURE,
} from '../../common/storage/storage.tokens';
import type { StorageProvider } from '../../common/storage/storage.interface';

describe('CloudStorageService（local 模式完整流程）', () => {
    let tmpRoot: string;
    let provider: LocalStorageProvider;
    let service: CloudStorageService;
    let repo: { find: jest.Mock; findOne: jest.Mock; update: jest.Mock };

    const makeConfig = (overrides: Record<string, string> = {}): ConfigService => {
        const values: Record<string, string> = {
            STORAGE_PROVIDER: 'local',
            LOCAL_STORAGE_PATH: tmpRoot,
            LOCAL_STORAGE_URL: 'https://nas.example.org/uploads',
            ...overrides,
        };
        return { get: (key: string) => values[key] } as unknown as ConfigService;
    };

    beforeEach(async () => {
        tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lk-mappkg-'));
        provider = new LocalStorageProvider(makeConfig());

        repo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({
                id: 'p1', type: 'basemap', name: 'Test', version: '1.0.0',
            }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CloudStorageService,
                { provide: MAP_PACKAGE_STORAGE, useValue: provider },
                { provide: getRepositoryToken(MapPackage), useValue: repo },
            ],
        }).compile();
        service = module.get(CloudStorageService);
    });

    afterEach(async () => {
        await fs.rm(tmpRoot, { recursive: true, force: true });
    });

    it('forFeature 在 local 模式下交出本地 provider', () => {
        const dynamic = StorageModule.forFeature(MAP_PACKAGE_STORAGE_FEATURE);
        const factory = (dynamic.providers as any[])[0];
        const built: StorageProvider = factory.useFactory(makeConfig());

        expect(built).toBeInstanceOf(LocalStorageProvider);
    });

    it('上傳 → 存檔 → URL 可組 → 刪除', async () => {
        const result = await service.uploadPackage('p1', Buffer.from('map-bytes'), 'application/zip');

        // URL 指向 nginx 的 /uploads/，路徑組成與 GCS 模式相同
        expect(result.url).toBe('https://nas.example.org/uploads/packages/p1.basemap');
        expect(result.size).toBe(9);
        expect(repo.update).toHaveBeenCalledWith('p1', {
            fileUrl: 'https://nas.example.org/uploads/packages/p1.basemap',
            fileSize: 9,
        });

        // 真的落在 LOCAL_STORAGE_PATH 底下
        expect(await fs.readFile(path.join(tmpRoot, 'packages', 'p1.basemap'), 'utf8'))
            .toBe('map-bytes');

        // 下載 URL 可組（無密鑰時即 /uploads 直出路徑）
        expect(await service.getSignedDownloadUrl('p1'))
            .toBe('https://nas.example.org/uploads/packages/p1.basemap');

        // 列表看得到、metadata 讀得到
        expect(await service.listStoredPackages()).toEqual(['packages/p1.basemap']);
        expect(await service.getPackageMetadata('p1')).toMatchObject({
            size: 9,
            customMetadata: { packageId: 'p1', version: '1.0.0', type: 'basemap' },
        });

        await service.deletePackage('p1');
        expect(await provider.exists('packages/p1.basemap')).toBe(false);
        expect(await service.getSignedDownloadUrl('p1')).toBeNull();
    });

    it('刪除不存在的 package 檔案不拋錯', async () => {
        await expect(service.deletePackage('p1')).resolves.toBeUndefined();
    });

    it('syncMetadata 以磁碟上的實際大小回填 DB', async () => {
        await service.uploadPackage('p1', Buffer.from('map-bytes'));
        repo.find.mockResolvedValue([{ id: 'p1', type: 'basemap', name: 'T', version: '1.0.0' }]);
        repo.update.mockClear();

        expect(await service.syncMetadata()).toBe(1);
        expect(repo.update).toHaveBeenCalledWith('p1', { fileSize: 9 });
    });

    it('sidecar metadata 不會被當成一個 package 列出來', async () => {
        await service.uploadPackage('p1', Buffer.from('map-bytes'));

        const listed = await service.listStoredPackages();

        expect(listed).toEqual(['packages/p1.basemap']);
        expect(listed.some((name) => name.endsWith('.meta.json'))).toBe(false);
    });
});
