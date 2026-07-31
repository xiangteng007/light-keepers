import { resolveSynchronize } from './database.module';

describe('resolveSynchronize', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    describe('production (hard-disabled)', () => {
        it('returns false when SYNC_TABLES=true in production', () => {
            expect(
                resolveSynchronize({ NODE_ENV: 'production', SYNC_TABLES: 'true' }),
            ).toBe(false);
        });

        it('logs an error-level warning when the unsafe combination is detected', () => {
            resolveSynchronize({ NODE_ENV: 'production', SYNC_TABLES: 'true' });

            expect(errorSpy).toHaveBeenCalledTimes(1);
            const message = String(errorSpy.mock.calls[0][0]);
            expect(message).toContain('[TypeORM]');
            expect(message).toContain('SYNC_TABLES=true');
            expect(message).toContain('HARD-DISABLED');
        });

        it('returns false when SYNC_TABLES is unset in production, without warning', () => {
            expect(resolveSynchronize({ NODE_ENV: 'production' })).toBe(false);
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('returns false when SYNC_TABLES=false in production, without warning', () => {
            expect(
                resolveSynchronize({ NODE_ENV: 'production', SYNC_TABLES: 'false' }),
            ).toBe(false);
            expect(errorSpy).not.toHaveBeenCalled();
        });
    });

    describe('non-production (existing behaviour preserved)', () => {
        it.each(['staging', 'development', 'test'])(
            'returns true when SYNC_TABLES=true and NODE_ENV=%s',
            (nodeEnv) => {
                expect(resolveSynchronize({ NODE_ENV: nodeEnv, SYNC_TABLES: 'true' })).toBe(true);
                expect(errorSpy).not.toHaveBeenCalled();
            },
        );

        it('returns true when SYNC_TABLES=true and NODE_ENV is unset', () => {
            expect(resolveSynchronize({ SYNC_TABLES: 'true' })).toBe(true);
        });

        it('returns false when SYNC_TABLES is not exactly "true"', () => {
            expect(resolveSynchronize({ NODE_ENV: 'development', SYNC_TABLES: 'TRUE' })).toBe(false);
            expect(resolveSynchronize({ NODE_ENV: 'development', SYNC_TABLES: '1' })).toBe(false);
            expect(resolveSynchronize({ NODE_ENV: 'development' })).toBe(false);
        });
    });

    it('defaults to process.env when no env object is supplied', () => {
        const previous = { NODE_ENV: process.env.NODE_ENV, SYNC_TABLES: process.env.SYNC_TABLES };
        try {
            process.env.NODE_ENV = 'production';
            process.env.SYNC_TABLES = 'true';
            expect(resolveSynchronize()).toBe(false);
        } finally {
            if (previous.NODE_ENV === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = previous.NODE_ENV;
            }
            if (previous.SYNC_TABLES === undefined) {
                delete process.env.SYNC_TABLES;
            } else {
                process.env.SYNC_TABLES = previous.SYNC_TABLES;
            }
        }
    });
});
