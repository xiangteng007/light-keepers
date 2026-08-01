import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
    DisableDto,
    VerifyBackupCodeDto,
    VerifyLoginDto,
    VerifyTokenDto,
} from './two-factor.controller';

/** 與 `main.ts` 的全域設定一致 */
const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
});

const meta = (metatype: unknown) => ({
    type: 'body' as const,
    metatype: metatype as new () => unknown,
    data: undefined,
});

describe('2FA DTOs（P0 輸入驗證）', () => {
    /**
     * 這條測試釘住修復的根因，也解釋為什麼「加裝飾器」同時是**修 bug**而不只是加強驗證：
     * class-validator 的 whitelist 以「欄位有無驗證裝飾器」判斷合法性，
     * 因此一個沒有任何裝飾器的 DTO 類別，會讓所有送進來的欄位都變成非白名單欄位，
     * 在 `forbidNonWhitelisted: true` 之下等同「這個端點永遠回 400」。
     */
    it('證明：無裝飾器的 DTO 會讓端點永遠回 400', async () => {
        class UndecoratedDto {
            token: string;
        }
        await expect(
            pipe.transform({ token: '123456' }, meta(UndecoratedDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    describe('VerifyTokenDto（啟用 2FA）', () => {
        const valid = { secret: 'JBSWY3DPEHPK3PXP', token: '123456' };

        it('accepts secret + 6-digit TOTP', async () => {
            await expect(pipe.transform({ ...valid }, meta(VerifyTokenDto))).resolves.toMatchObject(valid);
        });

        it.each(['12345', 'abcdef', '', '  123456  '])('rejects a malformed TOTP (%p)', async (token) => {
            await expect(
                pipe.transform({ ...valid, token }, meta(VerifyTokenDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects a missing secret', async () => {
            await expect(
                pipe.transform({ token: '123456' }, meta(VerifyTokenDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects unknown properties', async () => {
            await expect(
                pipe.transform({ ...valid, accountId: 'someone-else' }, meta(VerifyTokenDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('VerifyLoginDto（登入時驗證）', () => {
        it('accepts a 6-digit TOTP', async () => {
            await expect(
                pipe.transform({ token: '000123' }, meta(VerifyLoginDto)),
            ).resolves.toMatchObject({ token: '000123' });
        });

        it.each([{ $ne: null }, ['1', '2'], 123456, null])(
            'rejects a non-string TOTP (%p)',
            async (token) => {
                await expect(
                    pipe.transform({ token }, meta(VerifyLoginDto)),
                ).rejects.toBeInstanceOf(BadRequestException);
            },
        );
    });

    describe('DisableDto（停用 2FA）', () => {
        it('accepts a password', async () => {
            await expect(
                pipe.transform({ password: 'hunter2!' }, meta(DisableDto)),
            ).resolves.toMatchObject({ password: 'hunter2!' });
        });

        it('rejects an empty password', async () => {
            await expect(
                pipe.transform({ password: '' }, meta(DisableDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('VerifyBackupCodeDto', () => {
        it.each(['A1B2-C3D4', 'a1b2c3d4'])('accepts a backup code (%p)', async (code) => {
            await expect(
                pipe.transform({ code }, meta(VerifyBackupCodeDto)),
            ).resolves.toMatchObject({ code });
        });

        it.each(['A1B2-C3D', 'ZZZZ-ZZZZ', ''])('rejects a malformed backup code (%p)', async (code) => {
            await expect(
                pipe.transform({ code }, meta(VerifyBackupCodeDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });
});
