import {
    Controller,
    ForbiddenException,
    Inject,
    NotFoundException,
    PayloadTooLargeException,
    Put,
    Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Public } from '../../modules/shared/guards/public.decorator';
import { STORAGE_PROVIDER, StorageProvider } from './storage.interface';
import { LocalStorageProvider } from './local-storage.provider';

/**
 * upload-landing.controller.ts — local 模式簽名上傳落地端點（O21 / S·1.6）
 *
 * 背景（infra/nas/README.md §7.2-2 / §8）：`STORAGE_PROVIDER=local` 時
 * `getSignedUrl(action:'write')` 產出的 PUT URL 過去指向 nginx 的 `/uploads/`
 * 靜態出檔 location——nginx 無 dav_methods，客戶端直傳一律 405，
 * field-reports 附件的前端直傳流程在 NAS 上因此是斷的。
 *
 * 本端點補上落點：`PUT /api/v1/uploads/<path>?action=write&expires=…&signature=…`
 * （LocalStorageProvider 的 write URL 現在指到這裡；read URL 仍走 nginx 靜態出檔）。
 *
 * 安全模型——@Public() 但非匿名可寫：
 *   1. URL 本身是 capability：HMAC-SHA256(action:path:expires) 簽章＋過期時間，
 *      由 `LocalStorageProvider.verifySignature()`（timingSafeEqual）驗證；
 *      沒有 `LOCAL_STORAGE_SIGNING_SECRET` 就簽不出 write URL（provider 會拒發）。
 *   2. 簽章繫結 action=write——read URL 拿來 PUT 會驗不過。
 *   3. 路徑穿越由 provider 的 getFullPath()（resolve+root 檢查）擋在寫入前。
 *   4. 大小上限 `LOCAL_STORAGE_MAX_UPLOAD_MB`（預設 32，對齊 nginx
 *      client_max_body_size）；超限即斷流拋 413。
 *   5. GCS 模式下本端點回 404——雲端直傳走 GCS v4 簽名 URL，不經後端。
 */
@Public()
@Controller('uploads')
export class UploadLandingController {
    private readonly maxBytes: number;

    constructor(
        @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
        configService: ConfigService,
    ) {
        const mb = parseInt(configService.get<string>('LOCAL_STORAGE_MAX_UPLOAD_MB') || '32', 10);
        this.maxBytes = (Number.isFinite(mb) && mb > 0 ? mb : 32) * 1024 * 1024;
    }

    @Put('*')
    async land(@Req() req: Request): Promise<{ path: string; size: number }> {
        if (!(this.storage instanceof LocalStorageProvider)) {
            // GCS 模式：簽名 URL 直達雲端，本端點不存在語意
            throw new NotFoundException();
        }

        const filePath = this.extractPath(req);
        const expires = Number(req.query.expires);
        const signature = String(req.query.signature ?? '');
        const action = String(req.query.action ?? '');

        if (
            action !== 'write' ||
            !this.storage.verifySignature(filePath, 'write', expires, signature)
        ) {
            throw new ForbiddenException('簽章無效或已過期');
        }

        const body = await this.readBody(req);
        const contentType =
            typeof req.headers['content-type'] === 'string'
                ? req.headers['content-type']
                : 'application/octet-stream';

        await this.storage.upload(filePath, body, { contentType });
        return { path: filePath, size: body.length };
    }

    /** `/api/v1/uploads/<path>` → `<path>`（去 query、URL-decode） */
    private extractPath(req: Request): string {
        const raw = (req.originalUrl || req.url).split('?')[0];
        const marker = '/uploads/';
        const idx = raw.indexOf(marker);
        if (idx < 0) {
            throw new ForbiddenException('路徑無效');
        }
        const path = decodeURIComponent(raw.slice(idx + marker.length));
        if (!path) {
            throw new ForbiddenException('路徑無效');
        }
        return path;
    }

    /** 串流收集 body，超過上限立即斷流（不等整包收完才拒絕） */
    private readBody(req: Request): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            let size = 0;
            req.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > this.maxBytes) {
                    req.destroy();
                    reject(
                        new PayloadTooLargeException(
                            `附件超過上限 ${Math.floor(this.maxBytes / 1024 / 1024)}MB`,
                        ),
                    );
                    return;
                }
                chunks.push(chunk);
            });
            req.on('end', () => resolve(Buffer.concat(chunks)));
            req.on('error', (err) => reject(err));
        });
    }
}
