/**
 * 登入前／帳號接管相關流程的請求 DTO（P0 輸入驗證）
 *
 * 背景：全域 `ValidationPipe`（`main.ts`，`whitelist` + `forbidNonWhitelisted` + `transform`）
 * 只在參數型別是「類別」時才會運作。原本 `auth.controller.ts` 的 29 個 `@Body()`
 * 都寫成 inline 物件型別（`@Body() body: { code: string }`），TypeScript 型別在執行期
 * 不存在 → ValidationPipe 拿不到 metatype 直接放行，等同**完全沒有輸入驗證**：
 *   - 送 `{"code": {...}}` 或 `{"phone": ["a","b"]}` 會讓非字串值直接流進 service
 *     與 TypeORM 的 where 條件（型別混淆）。
 *   - 任意額外欄位不會被 whitelist 剝除。
 *   - 密碼長度、OTP 格式等規則只散落在 service，沒有統一入口把關。
 *
 * 這些端點多半在登入前（`@Public()` 或無 JWT 要求）且屬帳號接管面（OTP、密碼重設、
 * OAuth code 交換），因此列為 P0 優先補驗證的對象。
 */

import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

/** OTP 一律為 `OtpService.generateRandomCode()` 產生的 6 位數字 */
const OTP_PATTERN = /^\d{6}$/;
const OTP_MESSAGE = '驗證碼必須是 6 位數字';

/** OAuth authorization code / access token / id token 的長度上限（防超大 payload） */
const TOKEN_MAX_LENGTH = 8192;
/** redirect_uri 長度上限 */
const URI_MAX_LENGTH = 2048;
/** 密碼長度下限沿用 `ChangePasswordDto` 的 6 碼，上限防 bcrypt 前的超長輸入 */
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;

// =========================================
// OAuth / 第三方登入
// =========================================

/** LINE / Google 的 authorization code 交換（callback 與 bind-callback 共用） */
export class OAuthCallbackDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(TOKEN_MAX_LENGTH)
    code: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(URI_MAX_LENGTH)
    redirectUri: string;
}

/** 前端 SDK 已取得 access token 後的登入／綁定 */
export class OAuthAccessTokenDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(TOKEN_MAX_LENGTH)
    accessToken: string;
}

/** LIFF / Firebase 的 ID token 登入 */
export class IdTokenDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(TOKEN_MAX_LENGTH)
    idToken: string;
}

/** LINE 註冊新帳號 */
export class LineRegisterDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(TOKEN_MAX_LENGTH)
    accessToken: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    displayName: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    phone?: string;
}

/** Google 註冊新帳號（displayName 可由 Google profile 補齊，故為選填） */
export class GoogleRegisterDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(TOKEN_MAX_LENGTH)
    accessToken: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    displayName?: string;
}

// =========================================
// OTP 驗證
// =========================================

/** 發送手機 OTP */
export class SendPhoneOtpDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    phone: string;
}

/** 驗證手機 OTP */
export class VerifyPhoneOtpDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    phone: string;

    @IsString()
    @Matches(OTP_PATTERN, { message: OTP_MESSAGE })
    code: string;
}

/** 驗證 LINE OTP（目標帳號取自 JWT 的 lineUserId，body 只帶驗證碼） */
export class VerifyOtpCodeDto {
    @IsString()
    @Matches(OTP_PATTERN, { message: OTP_MESSAGE })
    code: string;
}

/** 發送 Email OTP／查詢 Email 驗證狀態 */
export class EmailOnlyDto {
    @IsEmail()
    email: string;
}

/** 驗證 Email OTP */
export class VerifyEmailOtpDto {
    @IsEmail()
    email: string;

    @IsString()
    @Matches(OTP_PATTERN, { message: OTP_MESSAGE })
    code: string;
}

/** 寄送／重寄自訂驗證信 */
export class SendVerificationEmailDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    displayName?: string;
}

// =========================================
// 密碼設定與重設
// =========================================

/** OAuth 帳號補設密碼（已登入） */
export class SetPasswordDto {
    @IsString()
    @MinLength(PASSWORD_MIN_LENGTH)
    @MaxLength(PASSWORD_MAX_LENGTH)
    newPassword: string;
}

/**
 * 忘記密碼：email 與 phone 皆為選填（擇一即可），
 * 「至少要有一個」的判斷維持在 `AuthService.requestPasswordReset()`，
 * 以免同時空白時洩漏「哪個欄位存在」的資訊。
 */
export class ForgotPasswordDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    phone?: string;
}

/** 以重設 token 設定新密碼（未登入） */
export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    token: string;

    @IsString()
    @MinLength(PASSWORD_MIN_LENGTH)
    @MaxLength(PASSWORD_MAX_LENGTH)
    newPassword: string;
}
