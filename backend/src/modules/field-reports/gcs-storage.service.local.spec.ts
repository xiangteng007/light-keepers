/**
 * gcs-storage.service.local.spec.ts
 *
 * INF-1 / M.3b：`STORAGE_PROVIDER=local`（NAS 搬遷後的實際組態）下的完整流程。
 * 附件流程是「後端發 URL、客戶端自己上傳」，所以這裡用 provider 直接落檔來模擬
 * 客戶端 PUT 完成的狀態，再驗證 service 能查到、能組出可讀 URL、能刪除。
 */
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { GcsStorageService } from './gcs-storage.service';
import { LocalStorageProvider } from '../../common/storage/local-storage.provider';
import { StorageModule } from '../../common/storage/storage.module';
import { FIELD_REPORT_STORAGE_FEATURE } from '../../common/storage/storage.tokens';
import type { StorageProvider } from '../../common/storage/storage.interface';

describe('GcsStorageService（local 模式完整流程）', () => {
    let tmpRoot: string;
    let provider: LocalStorageProvider;
    let service: GcsStorageService;

    const makeConfig = (overrides: Record<string, string> = {}): ConfigService => {
        const values: Record<string, string> = {
            STORAGE_PROVIDER: 'local',
            LOCAL_STORAGE_PATH: tmpRoot,
            LOCAL_STORAGE_URL: 'https://nas.example.org/uploads',
            // O21：write 簽名 URL 需要密鑰（無密鑰拒發），並指向 backend 落地端點
            LOCAL_STORAGE_SIGNING_SECRET: 'spec-secret',
            BASE_URL: 'https://nas.example.org',
            ...overrides,
        };
        return { get: (key: string) => values[key] } as unknown as ConfigService;
    };

    beforeEach(async () => {
        tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lk-fieldreports-'));
        provider = new LocalStorageProvider(makeConfig());
        service = new GcsStorageService(provider);
    });

    afterEach(async () => {
        await fs.rm(tmpRoot, { recursive: true, force: true });
    });

    it('forFeature 在 local 模式下忽略 bucket，交出本地 provider', () => {
        const dynamic = StorageModule.forFeature(FIELD_REPORT_STORAGE_FEATURE);
        const factory = (dynamic.providers as any[])[0];
        const built: StorageProvider = factory.useFactory(makeConfig());

        expect(built).toBeInstanceOf(LocalStorageProvider);
        expect(built.getContainerName()).toBe(tmpRoot);
    });

    it('上傳 → 存檔 → URL 可組 → 刪除', async () => {
        const upload = await service.generateUploadUrl('ms1', 'fr1', 'att1', 'image/jpeg');

        // 路徑組成與 GCS 模式相同
        expect(upload.path).toBe('reports/ms1/fr1/att1');
        expect(upload.method).toBe('PUT');
        // O21：write URL 指向 backend 落地端點（nginx /uploads/ 不收 PUT），帶簽章參數
        const uploadUrl = new URL(upload.url);
        expect(uploadUrl.origin + uploadUrl.pathname)
            .toBe('https://nas.example.org/api/v1/uploads/reports/ms1/fr1/att1');
        expect(uploadUrl.searchParams.get('action')).toBe('write');
        expect(uploadUrl.searchParams.get('signature')).toBeTruthy();

        // 模擬客戶端把檔案送達（NAS 上就是落在 bind mount 的 uploads 目錄）
        await provider.upload(upload.path, Buffer.from('photo-bytes'), {
            contentType: 'image/jpeg',
        });
        const onDisk = await fs.readFile(
            path.join(tmpRoot, 'reports', 'ms1', 'fr1', 'att1'),
            'utf8',
        );
        expect(onDisk).toBe('photo-bytes');

        expect(await service.fileExists(upload.path)).toBe(true);

        const meta = await service.getFileMetadata(upload.path);
        expect(meta?.size).toBe(11);
        expect(meta?.md5Hash).toBeDefined();
        expect(meta?.created?.getTime()).toBeGreaterThan(0);

        const download = await service.generateDownloadUrl(upload.path);
        expect(download.method).toBe('GET');
        const downloadUrl = new URL(download.url);
        expect(downloadUrl.origin + downloadUrl.pathname)
            .toBe('https://nas.example.org/uploads/reports/ms1/fr1/att1');

        expect(await service.deleteFile(upload.path)).toBe(true);
        expect(await service.fileExists(upload.path)).toBe(false);
    });

    it('刪除不存在的附件回 false', async () => {
        expect(await service.deleteFile('reports/ms1/fr1/nope')).toBe(false);
    });

    it('缺檔時 getFileMetadata 回 null 而非拋錯', async () => {
        expect(await service.getFileMetadata('reports/ms1/fr1/nope')).toBeNull();
    });

    it('縮圖 URL 沿用同一個 /uploads 前綴', async () => {
        const result = await service.generateThumbnailUploadUrl('reports/ms1/fr1/att1.jpg');

        expect(result.path).toBe('reports/ms1/fr1/att1_thumb.webp');
        const thumbUrl = new URL(result.url);
        expect(thumbUrl.origin + thumbUrl.pathname)
            .toBe('https://nas.example.org/api/v1/uploads/reports/ms1/fr1/att1_thumb.webp');
        expect(thumbUrl.searchParams.get('action')).toBe('write');
    });

    it('設定簽章密鑰後 URL 帶到期參數，且仍指向同一個 /uploads 路徑', async () => {
        const signed = new GcsStorageService(
            new LocalStorageProvider(makeConfig({ LOCAL_STORAGE_SIGNING_SECRET: 's3cret' })),
        );

        const result = await signed.generateDownloadUrl('reports/ms1/fr1/att1');
        const url = new URL(result.url);

        // nginx 以 $uri 比對，query string 不影響出檔 → 加簽不會讓現有設定壞掉
        expect(url.origin + url.pathname)
            .toBe('https://nas.example.org/uploads/reports/ms1/fr1/att1');
        expect(url.searchParams.get('action')).toBe('read');
        expect(Number(url.searchParams.get('expires'))).toBeGreaterThan(Date.now() / 1000);
        expect(url.searchParams.get('signature')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('路徑穿越的附件路徑不會被簽成 URL', async () => {
        await expect(service.generateDownloadUrl('../../etc/passwd')).rejects.toThrow();
    });
});
