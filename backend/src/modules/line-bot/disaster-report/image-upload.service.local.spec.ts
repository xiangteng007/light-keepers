/**
 * image-upload.service.local.spec.ts
 *
 * INF-1 / M.3b：`STORAGE_PROVIDER=local`（NAS 搬遷後的實際組態）下的完整流程。
 * LINE 災情照片是唯一「後端自己把 bytes 寫進 storage」的流程，所以這裡是真正的
 * 上傳 → 存檔 → URL 可組 → 刪除。
 */
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { ImageUploadService } from './image-upload.service';
import { LocalStorageProvider } from '../../../common/storage/local-storage.provider';
import { StorageModule } from '../../../common/storage/storage.module';
import { DISASTER_REPORT_IMAGE_STORAGE_FEATURE } from '../../../common/storage/storage.tokens';
import type { StorageProvider } from '../../../common/storage/storage.interface';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('ImageUploadService（local 模式完整流程）', () => {
    let tmpRoot: string;
    let provider: LocalStorageProvider;
    let service: ImageUploadService;

    const makeConfig = (overrides: Record<string, string> = {}): ConfigService => {
        const values: Record<string, string> = {
            STORAGE_PROVIDER: 'local',
            LOCAL_STORAGE_PATH: tmpRoot,
            LOCAL_STORAGE_URL: 'https://nas.example.org/uploads',
            ...overrides,
        };
        return { get: (key: string) => values[key] } as unknown as ConfigService;
    };

    const respondWithImage = (bytes = 8) => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(bytes)),
        });
    };

    beforeEach(async () => {
        tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lk-lineimg-'));
        provider = new LocalStorageProvider(makeConfig());
        service = new ImageUploadService(provider);
        mockFetch.mockReset();
    });

    afterEach(async () => {
        await fs.rm(tmpRoot, { recursive: true, force: true });
    });

    it('forFeature 在 local 模式下交出本地 provider', () => {
        const dynamic = StorageModule.forFeature(DISASTER_REPORT_IMAGE_STORAGE_FEATURE);
        const factory = (dynamic.providers as any[])[0];
        const built: StorageProvider = factory.useFactory(makeConfig());

        expect(built).toBeInstanceOf(LocalStorageProvider);
    });

    it('上傳 → 存檔 → URL 可組 → 刪除', async () => {
        respondWithImage();

        const url = await service.uploadFromLine('msg-1', 'user-1', 'token');

        // URL 指向 nginx 的 /uploads/，路徑組成與 GCS 模式相同
        expect(url).toMatch(
            /^https:\/\/nas\.example\.org\/uploads\/reports\/user-1\/\d+_[0-9a-f]{8}\.jpg$/,
        );

        // 真的落在 LOCAL_STORAGE_PATH 底下
        const relative = url.replace('https://nas.example.org/uploads/', '');
        const onDisk = await fs.stat(path.join(tmpRoot, relative));
        expect(onDisk.size).toBe(8);

        // 自訂 metadata 寫進 sidecar，且不會被 list 當成檔案
        const info = await provider.getMetadata(relative);
        expect(info.metadata).toMatchObject({ lineMessageId: 'msg-1', lineUserId: 'user-1' });

        // 用回傳的 URL 就能刪除
        expect(await service.deleteImage(url)).toBe(true);
        expect(await provider.exists(relative)).toBe(false);
    });

    it('重複刪除同一張圖回 false', async () => {
        respondWithImage();
        const url = await service.uploadFromLine('msg-1', 'user-1', 'token');

        expect(await service.deleteImage(url)).toBe(true);
        expect(await service.deleteImage(url)).toBe(false);
    });

    it('LINE content URL 這種非本地 storage 的 URL 不會被當成路徑處理', async () => {
        expect(await service.deleteImage('https://api-data.line.me/v2/bot/message/m/content'))
            .toBe(false);
    });

    it('storage 寫入失敗時仍回退到 LINE content URL', async () => {
        respondWithImage();
        jest.spyOn(provider, 'upload').mockRejectedValueOnce(new Error('EACCES'));

        const url = await service.uploadFromLine('msg-9', 'user-1', 'token');

        expect(url).toBe('https://api-data.line.me/v2/bot/message/msg-9/content');
    });

    it('generateSignedUrl 在無密鑰時就是 /uploads 直出路徑', async () => {
        expect(await service.generateSignedUrl('reports/user-1/a.jpg'))
            .toBe('https://nas.example.org/uploads/reports/user-1/a.jpg');
    });

    it('設定密鑰後簽出的 URL 可被 verifySignedUrl 驗證', async () => {
        const signing = new LocalStorageProvider(
            makeConfig({ LOCAL_STORAGE_SIGNING_SECRET: 's3cret' }),
        );
        const signed = new ImageUploadService(signing);

        const url = await signed.generateSignedUrl('reports/user-1/a.jpg', 30);

        expect(signing.verifySignedUrl(url)).toBe(true);
        expect(signing.verifySignedUrl(url.replace(/signature=.*/, 'signature=deadbeef')))
            .toBe(false);
        // 到期後失效
        expect(signing.verifySignedUrl(url, new Date(Date.now() + 31 * 60 * 1000))).toBe(false);
    });
});
