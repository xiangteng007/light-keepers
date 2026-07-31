/**
 * LINE Bot Webhook - 認證與簽章驗證整合測試
 *
 * 覆蓋 E.4 生產止血項目：
 * 1. webhook 端點必須是公開的（LINE 平台不會帶 JWT）
 *    → 使用「真實」的 GlobalAuthGuard（APP_GUARD），不用 overrideGuard 跳過
 * 2. 簽章必須以原始 raw body 計算，錯誤簽章要被拒絕
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { LineBotController } from './line-bot.controller';
import { LineBotService } from './line-bot.service';
import { DisasterReportService } from './disaster-report';
import { GlobalAuthGuard, IS_PUBLIC_KEY } from '../shared/guards';

const TEST_CHANNEL_SECRET = 'test-channel-secret-0123456789';

function sign(rawBody: string, secret = TEST_CHANNEL_SECRET): string {
    return crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
}

describe('LineBotController - webhook (real GlobalAuthGuard)', () => {
    let app: INestApplication;
    let lineBotService: any;
    let disasterReportService: any;

    const buildApp = async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [JwtModule.register({ secret: 'test-jwt-secret' })],
            controllers: [LineBotController],
            providers: [
                { provide: LineBotService, useValue: lineBotService },
                { provide: DisasterReportService, useValue: disasterReportService },
                // 真實的全域 default-deny guard
                { provide: APP_GUARD, useClass: GlobalAuthGuard },
            ],
        }).compile();

        const nestApp = moduleRef.createNestApplication({ rawBody: true });
        await nestApp.init();
        return nestApp;
    };

    beforeEach(async () => {
        lineBotService = {
            isEnabled: jest.fn().mockReturnValue(true),
            getConfig: jest.fn().mockReturnValue({
                channelAccessToken: 'test-token',
                channelSecret: TEST_CHANNEL_SECRET,
            }),
            replyMessage: jest.fn().mockResolvedValue(undefined),
            getBoundUserCount: jest.fn().mockResolvedValue(0),
        };
        disasterReportService = {
            isUserInReportFlow: jest.fn().mockResolvedValue(false),
            isReportTrigger: jest.fn().mockReturnValue(false),
            handleTextMessage: jest.fn().mockResolvedValue({ shouldReply: false }),
        };
        app = await buildApp();
    });

    afterEach(async () => {
        await app?.close();
    });

    describe('@Public() 標記', () => {
        it('webhook handler 帶有 GlobalAuthGuard 讀取的 isPublic metadata', () => {
            expect(
                Reflect.getMetadata(IS_PUBLIC_KEY, LineBotController.prototype.handleWebhook),
            ).toBe(true);
        });
    });

    describe('GlobalAuthGuard 行為', () => {
        // 對照組：證明全域 guard 真的有掛上（未標記的端點沒有 JWT 會 401）
        it('未標記公開的端點沒有 JWT 時回 401', async () => {
            await request(app.getHttpServer()).get('/line-bot/stats').expect(401);
        });

        it('webhook 沒有 JWT 也不會被 guard 擋下（不是 401）', async () => {
            lineBotService.isEnabled.mockReturnValue(false);

            const res = await request(app.getHttpServer())
                .post('/line-bot/webhook')
                .set('Content-Type', 'application/json')
                .send('{"events":[]}');

            expect(res.status).toBe(200);
            expect(res.text).toBe('Bot not configured');
        });
    });

    describe('簽章驗證（raw body HMAC）', () => {
        const rawBody = '{"events":[]}';

        it('缺少 x-line-signature 時回 401 Invalid signature', async () => {
            const res = await request(app.getHttpServer())
                .post('/line-bot/webhook')
                .set('Content-Type', 'application/json')
                .send(rawBody);

            expect(res.status).toBe(401);
            expect(res.text).toBe('Invalid signature');
        });

        it('錯誤簽章被拒絕（401，且不是 guard 的 401）', async () => {
            const res = await request(app.getHttpServer())
                .post('/line-bot/webhook')
                .set('Content-Type', 'application/json')
                .set('x-line-signature', sign(rawBody, 'wrong-secret'))
                .send(rawBody);

            expect(res.status).toBe(401);
            expect(res.text).toBe('Invalid signature');
        });

        it('用其他 body 算出的簽章（tamper）被拒絕', async () => {
            const res = await request(app.getHttpServer())
                .post('/line-bot/webhook')
                .set('Content-Type', 'application/json')
                .set('x-line-signature', sign('{"events":[{"type":"follow"}]}'))
                .send(rawBody);

            expect(res.status).toBe(401);
            expect(res.text).toBe('Invalid signature');
        });

        it('格式錯誤（非 base64 長度）的簽章不會拋 500', async () => {
            const res = await request(app.getHttpServer())
                .post('/line-bot/webhook')
                .set('Content-Type', 'application/json')
                .set('x-line-signature', 'not-a-valid-signature')
                .send(rawBody);

            expect(res.status).toBe(401);
            expect(res.text).toBe('Invalid signature');
        });

        it('正確簽章通過並回 200 OK', async () => {
            const res = await request(app.getHttpServer())
                .post('/line-bot/webhook')
                .set('Content-Type', 'application/json')
                .set('x-line-signature', sign(rawBody))
                .send(rawBody);

            expect(res.status).toBe(200);
            expect(res.text).toBe('OK');
        });

        it('正確簽章時事件會被處理（raw body 與重新序列化結果不同）', async () => {
            // 刻意加上縮排：JSON.stringify(已 parse 的 body) 會得到不同位元組，
            // 只有使用原始 raw body 計算 HMAC 才會通過
            const payload = JSON.stringify(
                {
                    events: [
                        {
                            type: 'follow',
                            replyToken: 'reply-token-1',
                            source: { type: 'user', userId: 'U123' },
                        },
                    ],
                },
                null,
                2,
            );

            const res = await request(app.getHttpServer())
                .post('/line-bot/webhook')
                .set('Content-Type', 'application/json')
                .set('x-line-signature', sign(payload))
                .send(payload);

            expect(res.status).toBe(200);
            expect(lineBotService.replyMessage).toHaveBeenCalledWith(
                'reply-token-1',
                expect.stringContaining('Light Keepers'),
            );
        });
    });
});
