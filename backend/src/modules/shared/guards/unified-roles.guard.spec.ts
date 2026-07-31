import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from './unified-roles.guard';
import { ReunificationController } from '../../reunification/reunification.controller';

/**
 * 1.6 guard 收斂：
 * (a) 未標記 @RequiredLevel 時維持 fail-open（避免大面積破壞），
 *     但必須輸出一次性 warn，含 Controller.handler 名稱。
 * (b) reunification 5 個管理端點必須帶有明確的 @RequiredLevel。
 */
describe('UnifiedRolesGuard', () => {
    const makeContext = (
        user: Record<string, any> | undefined,
        names: { controller?: string; handler?: string } = {},
    ): ExecutionContext => {
        const controllerName = names.controller ?? 'ProbeController';
        const handlerName = names.handler ?? 'probeHandler';

        const handler = { name: handlerName } as unknown as () => void;
        const klass = { name: controllerName } as unknown as new () => unknown;

        return {
            switchToHttp: () => ({ getRequest: () => ({ user }) }),
            getHandler: () => handler,
            getClass: () => klass,
        } as unknown as ExecutionContext;
    };

    const makeReflector = (values: Record<string, unknown>): Reflector =>
        ({
            getAllAndOverride: (key: string) => values[key],
        } as unknown as Reflector);

    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        // 每個測試都清掉一次性 warn 的去重快取
        (UnifiedRolesGuard as any).warnedHandlers.clear();
        warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    describe('未標記 @RequiredLevel / @RequiredRoles', () => {
        it('仍然放行（保持既有行為，避免大面積破壞）', () => {
            const guard = new UnifiedRolesGuard(makeReflector({}));
            expect(guard.canActivate(makeContext({ roleLevel: 0 }))).toBe(true);
        });

        it('輸出 warn 級 log，且含 Controller.handler 名稱', () => {
            const guard = new UnifiedRolesGuard(makeReflector({}));
            guard.canActivate(makeContext(undefined, { controller: 'FooController', handler: 'bar' }));

            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(String(warnSpy.mock.calls[0][0])).toContain('FooController.bar');
            expect(String(warnSpy.mock.calls[0][0])).toContain('authz-unmarked');
        });

        it('同一個 handler 只 warn 一次', () => {
            const guard = new UnifiedRolesGuard(makeReflector({}));
            const ctx = makeContext(undefined, { controller: 'FooController', handler: 'bar' });

            guard.canActivate(ctx);
            guard.canActivate(ctx);
            guard.canActivate(ctx);

            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('不同 handler 各 warn 一次', () => {
            const guard = new UnifiedRolesGuard(makeReflector({}));
            guard.canActivate(makeContext(undefined, { controller: 'A', handler: 'x' }));
            guard.canActivate(makeContext(undefined, { controller: 'A', handler: 'y' }));

            expect(warnSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('有標記 @RequiredLevel（行為保持）', () => {
        it('等級足夠時放行，且不 warn', () => {
            const guard = new UnifiedRolesGuard(makeReflector({ requiredLevel: ROLE_LEVELS.OFFICER }));
            expect(guard.canActivate(makeContext({ roleLevel: 3 }))).toBe(true);
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('等級不足時 403', () => {
            const guard = new UnifiedRolesGuard(makeReflector({ requiredLevel: ROLE_LEVELS.OFFICER }));
            expect(() => guard.canActivate(makeContext({ roleLevel: 1 }))).toThrow(ForbiddenException);
        });

        it('未登入且需要 Level 1+ 時 403', () => {
            const guard = new UnifiedRolesGuard(makeReflector({ requiredLevel: ROLE_LEVELS.OFFICER }));
            expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
        });

        it('Level 0 允許匿名', () => {
            const guard = new UnifiedRolesGuard(makeReflector({ requiredLevel: ROLE_LEVELS.PUBLIC }));
            expect(guard.canActivate(makeContext(undefined))).toBe(true);
        });
    });

    describe('reunification 管理端點已補上定級', () => {
        const reflector = new Reflector();

        it.each([
            ['createReport', ROLE_LEVELS.OFFICER],
            ['getByMission', ROLE_LEVELS.OFFICER],
            ['getStats', ROLE_LEVELS.OFFICER],
            ['markFound', ROLE_LEVELS.OFFICER],
            ['markReunited', ROLE_LEVELS.DIRECTOR],
        ])('%s 需要 level %s', (handlerName, expectedLevel) => {
            const handler = (ReunificationController.prototype as any)[handlerName as string];
            expect(reflector.get('requiredLevel', handler)).toBe(expectedLevel);
        });

        it('掛了 UnifiedRolesGuard 的管理端點不會再觸發 authz-unmarked warn', () => {
            const guard = new UnifiedRolesGuard(reflector);
            const handler = (ReunificationController.prototype as any).markReunited;

            const ctx = {
                switchToHttp: () => ({ getRequest: () => ({ user: { roleLevel: 3 } }) }),
                getHandler: () => handler,
                getClass: () => ReunificationController,
            } as unknown as ExecutionContext;

            expect(guard.canActivate(ctx)).toBe(true);
            expect(warnSpy).not.toHaveBeenCalled();
        });
    });

    describe('RequiredLevel decorator', () => {
        it('寫入 requiredLevel metadata', () => {
            class Probe {
                @RequiredLevel(ROLE_LEVELS.DIRECTOR)
                handler() { /* noop */ }
            }
            expect(new Reflector().get('requiredLevel', Probe.prototype.handler)).toBe(
                ROLE_LEVELS.DIRECTOR,
            );
        });
    });
});
