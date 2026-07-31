/**
 * local-storage.provider.spec.ts
 *
 * INF-1 / 工作項 M.3：NAS 搬遷後檔案儲存改走 local driver，
 * 這份 spec 驗證「env 切換即可運作」以及路徑穿越防護。
 */
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
    let tmpRoot: string;
    let provider: LocalStorageProvider;

    const makeConfig = (overrides: Record<string, string> = {}): ConfigService => {
        const values: Record<string, string> = {
            LOCAL_STORAGE_PATH: tmpRoot,
            LOCAL_STORAGE_URL: 'https://nas.example.org/uploads',
            ...overrides,
        };
        return { get: (key: string) => values[key] } as unknown as ConfigService;
    };

    beforeEach(async () => {
        tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lk-storage-'));
        provider = new LocalStorageProvider(makeConfig());
    });

    afterEach(async () => {
        await fs.rm(tmpRoot, { recursive: true, force: true });
    });

    describe('組態鍵（NAS 部署用的 env）', () => {
        it('讀 LOCAL_STORAGE_PATH 作為檔案落點', async () => {
            await provider.upload('reports/a.txt', Buffer.from('hello'));

            const onDisk = await fs.readFile(path.join(tmpRoot, 'reports', 'a.txt'), 'utf8');
            expect(onDisk).toBe('hello');
        });

        it('讀 LOCAL_STORAGE_URL 組出對外 URL（須指向 nginx 的 /uploads）', async () => {
            const result = await provider.upload('reports/a.txt', Buffer.from('hello'));

            expect(result.url).toBe('https://nas.example.org/uploads/reports/a.txt');
            expect(result.path).toBe('reports/a.txt');
            expect(result.size).toBe(5);
        });

        it('未設定時退回開發預設值，不會拋錯', () => {
            const emptyConfig = { get: () => undefined } as unknown as ConfigService;

            expect(() => new LocalStorageProvider(emptyConfig)).not.toThrow();
        });

        it('建構子不因基底目錄無法建立而拋出未處理的 rejection', async () => {
            // 把一個「檔案」當成基底目錄路徑：mkdir 必定失敗
            const filePath = path.join(tmpRoot, 'not-a-dir');
            await fs.writeFile(filePath, 'x');

            expect(() => new LocalStorageProvider(makeConfig({ LOCAL_STORAGE_PATH: filePath })))
                .not.toThrow();

            // 給非同步的 catch 一個 tick 執行，確認沒有變成 unhandled rejection
            await new Promise((resolve) => setImmediate(resolve));
        });
    });

    describe('基本檔案操作', () => {
        it('upload / download / exists / delete 一輪', async () => {
            await provider.upload('a/b/c.txt', Buffer.from('payload'));

            expect(await provider.exists('a/b/c.txt')).toBe(true);

            const downloaded = await provider.download('a/b/c.txt');
            expect(downloaded.data.toString()).toBe('payload');
            expect(downloaded.size).toBe(7);

            await provider.delete('a/b/c.txt');
            expect(await provider.exists('a/b/c.txt')).toBe(false);
        });

        it('delete 對不存在的檔案不拋錯（冪等）', async () => {
            await expect(provider.delete('never/existed.txt')).resolves.toBeUndefined();
        });

        it('list 回傳相對於基底目錄的路徑，且排除 .meta.json sidecar', async () => {
            await provider.upload('x/1.txt', Buffer.from('1'), { metadata: { k: 'v' } });
            await provider.upload('x/2.txt', Buffer.from('2'));

            const result = await provider.list({ prefix: 'x' });
            const paths = result.files.map((f) => f.path).sort();

            expect(paths).toEqual(['x/1.txt', 'x/2.txt']);
            expect(paths.some((p) => p.endsWith('.meta.json'))).toBe(false);
        });

        it('copy 保留來源，move 移除來源', async () => {
            await provider.upload('src.txt', Buffer.from('data'));

            await provider.copy('src.txt', 'copy.txt');
            expect(await provider.exists('src.txt')).toBe(true);
            expect(await provider.exists('copy.txt')).toBe(true);

            await provider.move('src.txt', 'moved.txt');
            expect(await provider.exists('src.txt')).toBe(false);
            expect(await provider.exists('moved.txt')).toBe(true);
        });
    });

    describe('路徑穿越防護', () => {
        // NAS 上基底目錄是真實的 bind mount，逃出去等同對主機任意讀寫。
        const escapes = [
            '../outside.txt',
            'a/../../outside.txt',
            'a/b/../../../outside.txt',
            '/etc/passwd',
        ];

        it.each(escapes)('upload 拒絕逃出基底目錄的路徑：%s', async (evil) => {
            await expect(provider.upload(evil, Buffer.from('pwned')))
                .rejects.toBeInstanceOf(BadRequestException);
        });

        it.each(escapes)('download 拒絕逃出基底目錄的路徑：%s', async (evil) => {
            await expect(provider.download(evil))
                .rejects.toBeInstanceOf(BadRequestException);
        });

        it.each(escapes)('delete 拒絕逃出基底目錄的路徑：%s', async (evil) => {
            await expect(provider.delete(evil))
                .rejects.toBeInstanceOf(BadRequestException);
        });

        it('exists 對逃逸路徑拋錯而非悄悄回報結果', async () => {
            await expect(provider.exists('../outside.txt'))
                .rejects.toBeInstanceOf(BadRequestException);
        });

        it('copy 的來源與目的地都受檢查', async () => {
            await provider.upload('ok.txt', Buffer.from('x'));

            await expect(provider.copy('ok.txt', '../escaped.txt'))
                .rejects.toBeInstanceOf(BadRequestException);
            await expect(provider.copy('../escaped.txt', 'ok2.txt'))
                .rejects.toBeInstanceOf(BadRequestException);
        });

        it('基底目錄內的正常巢狀路徑不受影響', async () => {
            await expect(provider.upload('a/b/c/deep.txt', Buffer.from('ok')))
                .resolves.toMatchObject({ path: 'a/b/c/deep.txt' });
        });

        it('目錄名以基底目錄名為前綴的兄弟目錄仍被擋下', async () => {
            // 例如 base=/data/uploads 時，/data/uploads-evil 不可被視為在範圍內
            const sibling = `../${path.basename(tmpRoot)}-evil/x.txt`;

            await expect(provider.upload(sibling, Buffer.from('x')))
                .rejects.toBeInstanceOf(BadRequestException);
        });
    });
});
