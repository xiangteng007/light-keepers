import { ForbiddenException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalStorageProvider } from './local-storage.provider';
import { UploadLandingController } from './upload-landing.controller';
import type { StorageProvider } from './storage.interface';

function makeConfig(overrides: Record<string, string | undefined>): ConfigService {
    return { get: (key: string) => overrides[key] } as unknown as ConfigService;
}

/** 以真實 stream 事件模擬 PUT request（controller 靠 data/end 事件收 body） */
function makeReq(url: string, body: Buffer): any {
    const readable = Readable.from([body]) as any;
    readable.originalUrl = url;
    readable.url = url;
    const u = new URL(url, 'http://localhost');
    readable.query = Object.fromEntries(u.searchParams.entries());
    readable.headers = { 'content-type': 'image/jpeg' };
    return readable;
}

describe('UploadLandingController（O21 local 直傳落地）', () => {
    let tmp: string;
    let provider: LocalStorageProvider;
    let controller: UploadLandingController;

    const SECRET = 'test-signing-secret';

    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-upload-'));
        provider = new LocalStorageProvider(
            makeConfig({
                LOCAL_STORAGE_PATH: tmp,
                LOCAL_STORAGE_URL: 'http://localhost:8080/uploads',
                LOCAL_STORAGE_SIGNING_SECRET: SECRET,
                BASE_URL: 'http://localhost:3000',
            }),
        );
        controller = new UploadLandingController(
            provider as unknown as StorageProvider,
            makeConfig({ LOCAL_STORAGE_MAX_UPLOAD_MB: '1' }),
        );
    });

    afterEach(() => {
        fs.rmSync(tmp, { recursive: true, force: true });
    });

    async function signedWriteUrl(filePath: string): Promise<string> {
        return provider.getSignedUrl(filePath, { action: 'write', expiresIn: 600 });
    }

    it('write 簽名 URL 指向 backend /api/v1/uploads 而非 nginx /uploads', async () => {
        const url = await signedWriteUrl('reports/a/b/c.jpg');
        expect(url.startsWith('http://localhost:3000/api/v1/uploads/reports/a/b/c.jpg?')).toBe(true);
        expect(url).toContain('action=write');
    });

    it('有效簽章：寫入成功並回 path/size', async () => {
        const url = await signedWriteUrl('reports/s1/r1/att1.jpg');
        const body = Buffer.from('fake-jpeg-bytes');
        const res = await controller.land(makeReq(url, body));
        expect(res).toEqual({ path: 'reports/s1/r1/att1.jpg', size: body.length });
        expect(fs.existsSync(path.join(tmp, 'reports/s1/r1/att1.jpg'))).toBe(true);
    });

    it('壞簽章 → 403', async () => {
        const url = (await signedWriteUrl('reports/x.jpg')).replace(/signature=\w+/, 'signature=deadbeef');
        await expect(controller.land(makeReq(url, Buffer.from('x')))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('read 簽章拿來 PUT → 403（action 繫結）', async () => {
        const readUrl = await provider.getSignedUrl('reports/x.jpg', { action: 'read', expiresIn: 600 });
        // read URL 指向 nginx；把它硬改成落地端點路徑格式來模擬攻擊者重放
        const forged = readUrl.replace('http://localhost:8080/uploads', 'http://localhost:3000/api/v1/uploads');
        await expect(controller.land(makeReq(forged, Buffer.from('x')))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('過期簽章 → 403', async () => {
        const url = await provider.getSignedUrl('reports/x.jpg', {
            action: 'write',
            expiresAt: new Date(Date.now() - 1000),
        });
        await expect(controller.land(makeReq(url, Buffer.from('x')))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('路徑穿越 → 403（驗章前擋）', async () => {
        const good = await signedWriteUrl('reports/ok.jpg');
        const evil = good.replace('reports/ok.jpg', 'reports/../../evil.sh');
        await expect(controller.land(makeReq(evil, Buffer.from('x')))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('超過大小上限 → 413', async () => {
        const url = await signedWriteUrl('reports/big.bin');
        const big = Buffer.alloc(1024 * 1024 + 1);
        await expect(controller.land(makeReq(url, big))).rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it('無簽章密鑰時 provider 拒發 write URL（fail loud）', async () => {
        const bare = new LocalStorageProvider(
            makeConfig({ LOCAL_STORAGE_PATH: tmp, LOCAL_STORAGE_URL: 'http://x/uploads' }),
        );
        await expect(bare.getSignedUrl('a.jpg', { action: 'write' })).rejects.toThrow(
            /LOCAL_STORAGE_SIGNING_SECRET/,
        );
    });

    it('GCS 模式 → 404（端點不存在語意）', async () => {
        const gcsLike = { upload: jest.fn() } as unknown as StorageProvider;
        const c = new UploadLandingController(gcsLike, makeConfig({}));
        await expect(c.land(makeReq('http://x/api/v1/uploads/a?action=write', Buffer.from('x'))))
            .rejects.toBeInstanceOf(NotFoundException);
    });
});
