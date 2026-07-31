import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CoreJwtGuard } from './core-jwt.guard';
import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { IntakeController } from '../../intake/intake.controller';

/**
 * 1.6 guard 收斂：CoreJwtGuard 必須尊重 @Public()
 *
 * 修正前：CoreJwtGuard 不認得 @Public()，沒有 token 一律 401，
 * 導致 intake 這類「class 級掛 guard + handler 級 @Public」的匿名通報
 * 路徑無法成立。修正後 @Public() 的 handler/class 一律放行。
 */
describe('CoreJwtGuard', () => {
    const makeContext = (
        opts: { authorization?: string; publicValue?: boolean } = {},
    ): { context: ExecutionContext; request: Record<string, any> } => {
        const request: Record<string, any> = {
            headers: opts.authorization ? { authorization: opts.authorization } : {},
        };

        const context = {
            switchToHttp: () => ({ getRequest: () => request }),
            getHandler: () => function handler() { /* noop */ },
            getClass: () => class TestController { },
        } as unknown as ExecutionContext;

        return { context, request };
    };

    const makeReflector = (isPublic?: boolean): Reflector =>
        ({ getAllAndOverride: () => isPublic } as unknown as Reflector);

    const jwtService = {
        verify: jest.fn(),
    };

    beforeEach(() => {
        jwtService.verify.mockReset();
    });

    describe('@Public() 端點', () => {
        it('沒有 token 也放行（不再 401）', async () => {
            const guard = new CoreJwtGuard(jwtService as any, makeReflector(true));
            const { context, request } = makeContext();

            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect(request.user).toBeUndefined();
        });

        it('帶無效 token 也放行，不拋錯', async () => {
            jwtService.verify.mockImplementation(() => {
                throw new Error('jwt malformed');
            });
            const guard = new CoreJwtGuard(jwtService as any, makeReflector(true));
            const { context, request } = makeContext({ authorization: 'Bearer garbage' });

            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect(request.user).toBeUndefined();
        });

        it('帶有效 token 時仍會盡力填入 request.user', async () => {
            jwtService.verify.mockReturnValue({
                sub: 'acc-1',
                email: 'a@example.com',
                roleLevel: 2,
                roles: ['officer'],
            });
            const guard = new CoreJwtGuard(jwtService as any, makeReflector(true));
            const { context, request } = makeContext({ authorization: 'Bearer good' });

            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect(request.user).toMatchObject({ id: 'acc-1', uid: 'acc-1', roleLevel: 2 });
        });
    });

    describe('非 @Public() 端點（行為保持）', () => {
        it('沒有 token 仍然 401', async () => {
            const guard = new CoreJwtGuard(jwtService as any, makeReflector(undefined));
            const { context } = makeContext();

            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('無效 token 仍然 401', async () => {
            jwtService.verify.mockImplementation(() => {
                throw new Error('jwt expired');
            });
            const guard = new CoreJwtGuard(jwtService as any, makeReflector(undefined));
            const { context } = makeContext({ authorization: 'Bearer bad' });

            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('有效 token 時填入正規化的 request.user', async () => {
            jwtService.verify.mockReturnValue({
                sub: 'acc-9',
                email: 'b@example.com',
                roleLevel: 5,
                roles: ['owner'],
            });
            const guard = new CoreJwtGuard(jwtService as any, makeReflector(undefined));
            const { context, request } = makeContext({ authorization: 'Bearer good' });

            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect(request.user).toMatchObject({
                id: 'acc-9',
                sub: 'acc-9',
                uid: 'acc-9',
                role: 'owner',
                roleLevel: 5,
            });
        });
    });

    describe('與 GlobalAuthGuard 共用同一個 metadata key', () => {
        it('@Public() 寫入的 key 就是 isPublic', () => {
            class Probe {
                @Public()
                handler() { /* noop */ }
            }
            const reflector = new Reflector();
            expect(reflector.get(IS_PUBLIC_KEY, Probe.prototype.handler)).toBe(true);
        });
    });

    describe('intake 匿名通報路徑', () => {
        it('IntakeController.create 標記為 @Public()，CoreJwtGuard 會無 token 放行', async () => {
            const reflector = new Reflector();
            expect(
                reflector.get(IS_PUBLIC_KEY, IntakeController.prototype.create),
            ).toBe(true);

            // 以真實 Reflector 讀取真實 handler 的 metadata
            const request: Record<string, any> = { headers: {} };
            const context = {
                switchToHttp: () => ({ getRequest: () => request }),
                getHandler: () => IntakeController.prototype.create,
                getClass: () => IntakeController,
            } as unknown as ExecutionContext;

            const guard = new CoreJwtGuard(jwtService as any, reflector);
            await expect(guard.canActivate(context)).resolves.toBe(true);
        });

        it('IntakeController 的非公開端點沒有 isPublic metadata（仍需登入）', () => {
            const reflector = new Reflector();
            expect(
                reflector.get(IS_PUBLIC_KEY, IntakeController.prototype.findAll),
            ).toBeUndefined();
        });
    });
});
