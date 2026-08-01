import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
    ForgotPasswordDto,
    GoogleRegisterDto,
    IdTokenDto,
    LineRegisterDto,
    OAuthAccessTokenDto,
    OAuthCallbackDto,
    ResetPasswordDto,
    SendPhoneOtpDto,
    SendVerificationEmailDto,
    SetPasswordDto,
    EmailOnlyDto,
    VerifyEmailOtpDto,
    VerifyOtpCodeDto,
    VerifyPhoneOtpDto,
} from './auth-flows.dto';

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

/** 非字串輸入：未驗證時會原封不動流進 service 與 TypeORM 的 where 條件 */
const NON_STRING_PAYLOADS = [{ $gt: '' }, ['a', 'b'], 123, null];

describe('auth flow DTOs（P0 輸入驗證）', () => {
    describe('OAuthCallbackDto', () => {
        const valid = { code: 'authcode-123', redirectUri: 'https://lightkeepers.ngo/auth/callback' };

        it('accepts a valid authorization code exchange', async () => {
            await expect(pipe.transform({ ...valid }, meta(OAuthCallbackDto))).resolves.toMatchObject(valid);
        });

        it('rejects a missing redirectUri', async () => {
            await expect(
                pipe.transform({ code: 'authcode-123' }, meta(OAuthCallbackDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it.each(NON_STRING_PAYLOADS)('rejects a non-string code (%p)', async (code) => {
            await expect(
                pipe.transform({ ...valid, code }, meta(OAuthCallbackDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects unknown properties (whitelist)', async () => {
            await expect(
                pipe.transform({ ...valid, roleLevel: 5 }, meta(OAuthCallbackDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('OAuthAccessTokenDto / IdTokenDto', () => {
        it('accepts a token string', async () => {
            await expect(
                pipe.transform({ accessToken: 'tok' }, meta(OAuthAccessTokenDto)),
            ).resolves.toMatchObject({ accessToken: 'tok' });
            await expect(
                pipe.transform({ idToken: 'tok' }, meta(IdTokenDto)),
            ).resolves.toMatchObject({ idToken: 'tok' });
        });

        it('rejects an empty token', async () => {
            await expect(
                pipe.transform({ accessToken: '' }, meta(OAuthAccessTokenDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects an oversized token（防超大 payload）', async () => {
            await expect(
                pipe.transform({ idToken: 'x'.repeat(8193) }, meta(IdTokenDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('LineRegisterDto / GoogleRegisterDto', () => {
        it('accepts a LINE registration payload', async () => {
            const body = { accessToken: 'tok', displayName: '王小明', email: 'a@b.co', phone: '0912345678' };
            await expect(pipe.transform(body, meta(LineRegisterDto))).resolves.toMatchObject(body);
        });

        it('rejects a LINE registration without displayName', async () => {
            await expect(
                pipe.transform({ accessToken: 'tok' }, meta(LineRegisterDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects a malformed email', async () => {
            await expect(
                pipe.transform({ accessToken: 'tok', displayName: 'A', email: 'not-an-email' }, meta(LineRegisterDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('allows Google registration without displayName', async () => {
            await expect(
                pipe.transform({ accessToken: 'tok' }, meta(GoogleRegisterDto)),
            ).resolves.toMatchObject({ accessToken: 'tok' });
        });
    });

    describe('OTP DTOs', () => {
        it('accepts a 6-digit code', async () => {
            await expect(
                pipe.transform({ code: '123456' }, meta(VerifyOtpCodeDto)),
            ).resolves.toMatchObject({ code: '123456' });
        });

        it.each(['12345', '1234567', 'abcdef', '12 34 56', ''])(
            'rejects a malformed OTP code (%p)',
            async (code) => {
                await expect(
                    pipe.transform({ code }, meta(VerifyOtpCodeDto)),
                ).rejects.toBeInstanceOf(BadRequestException);
            },
        );

        it.each(NON_STRING_PAYLOADS)('rejects a non-string OTP code (%p)', async (code) => {
            await expect(
                pipe.transform({ code }, meta(VerifyOtpCodeDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('accepts phone + code', async () => {
            const body = { phone: '0912345678', code: '123456' };
            await expect(pipe.transform(body, meta(VerifyPhoneOtpDto))).resolves.toMatchObject(body);
        });

        /**
         * 關鍵案例：`phone` 未驗證時會直接進入
         * `otpRepository.findOne({ where: { target: phone } })` 的查詢條件。
         */
        it.each(NON_STRING_PAYLOADS)('rejects a non-string phone (%p)', async (phone) => {
            await expect(
                pipe.transform({ phone, code: '123456' }, meta(VerifyPhoneOtpDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects an oversized phone', async () => {
            await expect(
                pipe.transform({ phone: '0'.repeat(21) }, meta(SendPhoneOtpDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('accepts email + code', async () => {
            const body = { email: 'a@b.co', code: '123456' };
            await expect(pipe.transform(body, meta(VerifyEmailOtpDto))).resolves.toMatchObject(body);
        });

        it('rejects a malformed email in the OTP flow', async () => {
            await expect(
                pipe.transform({ email: 'a@', code: '123456' }, meta(VerifyEmailOtpDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('EmailOnlyDto / SendVerificationEmailDto', () => {
        it('requires a well-formed email', async () => {
            await expect(
                pipe.transform({ email: 'a@b.co' }, meta(EmailOnlyDto)),
            ).resolves.toMatchObject({ email: 'a@b.co' });
            await expect(
                pipe.transform({}, meta(EmailOnlyDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        /** firebase-auth.service 會送 `displayName: null`（Firebase profile 可能為空） */
        it('tolerates a null displayName', async () => {
            await expect(
                pipe.transform({ email: 'a@b.co', displayName: null }, meta(SendVerificationEmailDto)),
            ).resolves.toMatchObject({ email: 'a@b.co' });
        });
    });

    describe('密碼設定與重設', () => {
        it('accepts a password of at least 6 characters', async () => {
            await expect(
                pipe.transform({ newPassword: 'abc123' }, meta(SetPasswordDto)),
            ).resolves.toMatchObject({ newPassword: 'abc123' });
        });

        it('rejects a password shorter than 6 characters', async () => {
            await expect(
                pipe.transform({ newPassword: 'abc' }, meta(SetPasswordDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects an oversized password', async () => {
            await expect(
                pipe.transform({ newPassword: 'x'.repeat(129) }, meta(SetPasswordDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('accepts a reset token + new password', async () => {
            const body = { token: 'reset-token', newPassword: 'abc123' };
            await expect(pipe.transform(body, meta(ResetPasswordDto))).resolves.toMatchObject(body);
        });

        it.each(NON_STRING_PAYLOADS)('rejects a non-string reset token (%p)', async (token) => {
            await expect(
                pipe.transform({ token, newPassword: 'abc123' }, meta(ResetPasswordDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('allows forgot-password with either email or phone', async () => {
            await expect(
                pipe.transform({ email: 'a@b.co' }, meta(ForgotPasswordDto)),
            ).resolves.toMatchObject({ email: 'a@b.co' });
            await expect(
                pipe.transform({ phone: '0912345678' }, meta(ForgotPasswordDto)),
            ).resolves.toMatchObject({ phone: '0912345678' });
        });

        it('rejects a malformed email in forgot-password', async () => {
            await expect(
                pipe.transform({ email: 'nope' }, meta(ForgotPasswordDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });
});
