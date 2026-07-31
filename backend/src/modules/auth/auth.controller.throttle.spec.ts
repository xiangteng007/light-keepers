/**
 * Rate Limiting 行為測試（BE-5, 2026-08-01）
 *
 * 目的：證明敏感端點的 `@Throttle` 宣告**確實生效**，超限回 429。
 *
 * 這是一組回歸測試，守護一個曾實際存在的靜默缺陷：
 * `ThrottlerGuard` 以「已設定的 throttler 名稱」反射查詢
 * `@Throttle({ <name>: ... })` 的 metadata。基準 throttler 一度命名為 `long`，
 * 而全 repo 的 `@Throttle` 皆宣告 `{ default: ... }`，名稱不匹配導致
 * **所有端點客製限流全部失效**（登入名義 5/min、實則走全域 100/min）。
 *
 * 因此本測試刻意直接引用 production 的 `THROTTLER_CONFIG`——
 * 若有人把 `default` 改回 `long`（或其他名稱），第 6 次登入會回 200 而非 429，
 * 本測試即失敗。
 *
 * @see docs/adr/ADR-004-rate-limiting.md
 * @see src/common/config/throttler.config.ts
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
    ThrottlerModule,
    ThrottlerGuard,
    ThrottlerModuleOptions,
} from '@nestjs/throttler';
import * as request from 'supertest';

import { THROTTLER_CONFIG } from '../../common/config/throttler.config';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AccountManagementService } from './services/account-management.service';

describe('AuthController — rate limiting (429)', () => {
    let app: INestApplication;

    /**
     * 每個測試都重建 app，確保 ThrottlerStorage 的計數器歸零
     * （預設為單機記憶體儲存，跨測試會累加）。
     */
    beforeEach(async () => {
        const authService = {
            login: jest.fn().mockResolvedValue({
                accessToken: 'test-access-token',
                expiresIn: 3600,
                user: { id: 'acc-1', email: 'user@example.com' },
            }),
            requestPasswordReset: jest.fn().mockResolvedValue({ success: true }),
        };
        const refreshTokenService = {
            createRefreshToken: jest.fn().mockResolvedValue('test-refresh-token'),
        };
        const accountManagementService = {};

        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                // 直接沿用 production 設定 —— 這正是本測試的回歸價值所在
                ThrottlerModule.forRoot(
                    THROTTLER_CONFIG as unknown as ThrottlerModuleOptions,
                ),
            ],
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: RefreshTokenService, useValue: refreshTokenService },
                {
                    provide: AccountManagementService,
                    useValue: accountManagementService,
                },
                { provide: APP_GUARD, useClass: ThrottlerGuard },
            ],
        })
            // 認證不是本測試的標的，一律放行，讓請求打到 ThrottlerGuard 之後的 handler
            .overrideGuard(CoreJwtGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app?.close();
    });

    describe('POST /auth/login （5 次 / 分鐘）', () => {
        const body = { email: 'user@example.com', password: 'correct-horse' };

        it('前 5 次請求皆放行（非 429）', async () => {
            for (let i = 1; i <= 5; i++) {
                const res = await request(app.getHttpServer())
                    .post('/auth/login')
                    .send(body);

                expect(res.status).not.toBe(429);
            }
        });

        it('第 6 次請求回 429 Too Many Requests', async () => {
            for (let i = 1; i <= 5; i++) {
                await request(app.getHttpServer()).post('/auth/login').send(body);
            }

            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send(body);

            expect(res.status).toBe(429);
        });

        it('超限後不再進入 handler（AuthService.login 僅被呼叫 5 次）', async () => {
            const authService = app.get<{ login: jest.Mock }>(AuthService);

            for (let i = 1; i <= 7; i++) {
                await request(app.getHttpServer()).post('/auth/login').send(body);
            }

            expect(authService.login).toHaveBeenCalledTimes(5);
        });

        it('回應帶 X-RateLimit-* 標頭（default throttler 無名稱後綴）', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send(body);

            // 基準 throttler 命名為 'default' 時 suffix 為空字串。
            // 若被改回 'long'，標頭會變成 x-ratelimit-limit-long，此處即失敗。
            expect(res.headers['x-ratelimit-limit']).toBe('5');
            expect(res.headers['x-ratelimit-remaining']).toBe('4');
        });
    });

    describe('POST /auth/forgot-password （5 次 / 分鐘）', () => {
        const body = { email: 'user@example.com' };

        it('第 6 次請求回 429 Too Many Requests', async () => {
            for (let i = 1; i <= 5; i++) {
                await request(app.getHttpServer())
                    .post('/auth/forgot-password')
                    .send(body);
            }

            const res = await request(app.getHttpServer())
                .post('/auth/forgot-password')
                .send(body);

            expect(res.status).toBe(429);
        });

        it('各端點計數器獨立 —— 打爆 login 不影響 forgot-password', async () => {
            for (let i = 1; i <= 6; i++) {
                await request(app.getHttpServer())
                    .post('/auth/login')
                    .send({ email: 'user@example.com', password: 'x' });
            }

            const res = await request(app.getHttpServer())
                .post('/auth/forgot-password')
                .send(body);

            expect(res.status).not.toBe(429);
        });
    });

    describe('THROTTLER_CONFIG 命名契約', () => {
        it('基準 throttler 必須命名為 default，@Throttle({ default: ... }) 才會生效', () => {
            const names = THROTTLER_CONFIG.map((t) => t.name);

            expect(names).toContain('default');
        });
    });
});
