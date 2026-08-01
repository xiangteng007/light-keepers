import { Controller, Post, Body, Get, Patch, Delete, Param, Query, UseGuards, Request, Res, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AccountManagementService } from './services/account-management.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto, UpdatePreferencesDto } from './dto/auth.dto';
import {
    OAuthCallbackDto,
    OAuthAccessTokenDto,
    IdTokenDto,
    LineRegisterDto,
    GoogleRegisterDto,
    SendPhoneOtpDto,
    VerifyPhoneOtpDto,
    VerifyOtpCodeDto,
    EmailOnlyDto,
    VerifyEmailOtpDto,
    SendVerificationEmailDto,
    SetPasswordDto,
    ForgotPasswordDto,
    ResetPasswordDto,
} from './dto/auth-flows.dto';
import { Public } from './decorators/public.decorator';

// Request types for type safety
interface RequestWithCookies {
    headers: { 'user-agent'?: string };
    ip?: string;
    cookies?: { refresh_token?: string };
}

// 定級理由（本次只處理 `GET /auth/permissions`、`GET /auth/roles` 兩個真缺口）：
// 1. 已標 `@Public()` 者（register/login/forgot-password/reset-password/refresh）依任務界線不動。
// 2. 已掛 `@UseGuards(CoreJwtGuard, UnifiedRolesGuard)` 但未標 `@RequiredLevel` 者（me、profile、
//    change-password、preferences、sessions、bind 系列…）刻意維持「僅需登入」：這些是本人自助操作，
//    加上 L1 反而會把「已註冊但尚未核准、roleLevel 仍為 0」的帳號鎖在改密碼與補件流程之外。
// 3. 登入前流程（line/google/liff/firebase 的 login/callback/register、OTP 與 Email 驗證系列）與
//    `POST /auth/logout`（以 refresh cookie 運作、須能在 access token 過期後仍可登出）本次**不加 Guard**：
//    它們語意上需要 `@Public()`，加上等級標記會讓日後無法只靠 `@Public()` 修復；
//    且全域 `GlobalAuthGuard` 已 default-deny，目前不存在「任何人可存取」的授權缺口。
//    正確修法是把它們補進 `docs/policy/public-surface.policy.json` 後再標 `@Public()`，屬功能面決策，
//    已列入 docs/audit/AUTHZ_LEVELS_APPLIED_A.md 的後續建議。
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly refreshTokenService: RefreshTokenService,
        private readonly accountManagementService: AccountManagementService,
    ) { }

    @Public()
    // 限流：5/min per IP —— 匿名建帳號，防批次註冊灌水
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Public()
    // 限流：5/min per IP（原 10/min 收緊）—— 密碼登入為憑證暴力破解主要面
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('login')
    async login(
        @Body() dto: LoginDto,
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(dto);

        // Generate and set refresh token cookie
        const refreshToken = await this.refreshTokenService.createRefreshToken(
            result.user.id,
            req.headers['user-agent'],
            req.ip,
        );

        res.cookie('refresh_token', refreshToken, this.getCookieOptions());

        return result;
    }

    @Get('me')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async getProfile(@Request() req: { user: { id: string; email?: string; roleLevel?: number } }) {
        // 從資料庫獲取最新帳號資料（包含角色與綁定狀態）
        const account = await this.accountManagementService.getAccountById(req.user.id);
        // 使用資料庫角色（含 level），而非 JWT 的 string[] roles
        const dbRoles = account?.roles || [];
        const roleLevel = dbRoles.length > 0
            ? Math.max(...dbRoles.map(r => r.level || 0))
            : (req.user.roleLevel ?? 0);

        return {
            id: req.user.id,
            email: account?.email || req.user.email,
            phone: account?.phone,
            displayName: account?.displayName,
            avatarUrl: account?.avatarUrl || null,
            lineLinked: !!(account?.lineUserId),
            googleLinked: !!(account?.googleId),
            volunteerProfileCompleted: account?.volunteerProfileCompleted || false,
            roles: dbRoles.map(r => r.name),
            roleLevel,
            roleDisplayName: dbRoles.find(r => r.level === roleLevel)?.displayName
                || (roleLevel > 0 ? '登記志工' : '一般民眾'),
        };
    }

    /**
     * 獲取頁面權限配置
     *
     * 定級理由：此端點與 `GET /accounts/page-permissions` 回傳同一份權限配置，屬重複端點，
     * 且全庫（含 web-dashboard）查無任何呼叫端。既然沒有前端相依，就以「權限設定讀取」的
     * 保守標準定為 L3（常務理事），避免留一條沒人用卻可被拿來枚舉權限矩陣的旁路。
     * 前端實際使用的是 `/accounts/page-permissions`（定為 L1），兩者刻意不同級。
     */
    @Get('permissions')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async getPermissions() {
        return this.accountManagementService.getPagePermissions();
    }

    /**
     * 獲取所有角色
     *
     * 定級理由：同上，與 `GET /accounts/roles` 重複且無呼叫端。角色清單含 level 對照，
     * 是提權偵察的起點 → L3，與 `/accounts/roles` 一致。
     */
    @Get('roles')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async getRoles() {
        return this.accountManagementService.getAllRoles();
    }

    // =========================================
    // REMOVED: Dangerous temporary admin endpoints
    // =========================================
    // The following endpoints were REMOVED for security:
    // - GET /auth/diagnose/:email (unprotected, exposed account info)
    // - POST /auth/admin/reset-password (hardcoded key: LK_ADMIN_2026_RESET)
    // - POST /auth/admin/recreate-owner (hardcoded key: LK_ADMIN_2026_RESET)
    //
    // If admin functionality is needed, use:
    // 1. @UseGuards(CoreJwtGuard, UnifiedRolesGuard) + @RequiredLevel(5)
    // 2. Environment variable for admin key
    // 3. Audit logging
    // =========================================

    /**
     * LINE OAuth Callback
     * 前端重導向回來時，用 authorization code 換取 access token
     */
    // 限流：10/min per IP —— OAuth code 交換，由 LINE 端先行驗證，
    // 非密碼暴力破解面，故較密碼登入寬鬆；仍收緊於全域 100/min 基準。
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('line/callback')
    async lineCallback(
        @Body() body: OAuthCallbackDto,
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.exchangeLineCode(body.code, body.redirectUri);

        // Only set cookie if login was successful (not needsRegistration)
        if ('accessToken' in result) {
            const refreshToken = await this.refreshTokenService.createRefreshToken(
                result.user.id,
                req.headers['user-agent'],
                req.ip,
            );
            res.cookie('refresh_token', refreshToken, this.getCookieOptions());
        }

        return result;
    }

    /**
     * LINE 登入
     * 前端透過 LINE SDK 取得 access token 後呼叫此 API
     */
    // 限流：10/min per IP —— 社群登入（access token 交換）
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('line/login')
    async loginWithLine(
        @Body() body: OAuthAccessTokenDto,
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.loginWithLine(body.accessToken);

        // Only set cookie if login was successful (not needsRegistration)
        if ('accessToken' in result) {
            const refreshToken = await this.refreshTokenService.createRefreshToken(
                result.user.id,
                req.headers['user-agent'],
                req.ip,
            );
            res.cookie('refresh_token', refreshToken, this.getCookieOptions());
        }

        return result;
    }

    /**
     * LINE 註冊新帳號
     * 若 LINE 帳號未綁定，使用此 API 建立新帳號
     */
    // 限流：5/min per IP —— 建帳號路徑，與 /auth/register 同級
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('line/register')
    async registerWithLine(@Body() body: LineRegisterDto) {
        return this.authService.registerWithLine(body.accessToken, body.displayName, body.email, body.phone);
    }

    /**
     * 綁定 LINE 帳號
     * 已登入用戶綁定 LINE 帳號
     */
    @Post('line/bind')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async bindLine(@Request() req: { user: { id: string } }, @Body() body: OAuthAccessTokenDto) {
        const lineProfile = await this.authService.verifyLineToken(body.accessToken);
        await this.authService.bindLineAccount(req.user.id, lineProfile.userId, lineProfile.displayName);
        return { success: true, lineDisplayName: lineProfile.displayName };
    }

    /**
     * 綁定 LINE 帳號 (OAuth Callback 版本)
     * 從 OAuth 回調中用 code 換取 token 並綁定
     */
    @Post('line/bind-callback')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async bindLineCallback(
        @Request() req: { user: { id: string } },
        @Body() body: OAuthCallbackDto
    ) {
        // 使用 code 換取 access token
        const accessToken = await this.authService.exchangeLineCodeForToken(body.code, body.redirectUri);
        // 驗證並綁定
        const lineProfile = await this.authService.verifyLineToken(accessToken);
        await this.authService.bindLineAccount(req.user.id, lineProfile.userId, lineProfile.displayName);
        return { success: true, lineDisplayName: lineProfile.displayName };
    }

    /**
     * LIFF Token 登入
     * 前端在 LINE App 內透過 LIFF SDK 取得 ID Token 後呼叫此 API
     * 用於 SSO 無縫登入體驗
     */
    // 限流：10/min per IP —— LIFF ID Token 登入
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('liff/login')
    async loginWithLiffToken(
        @Body() body: IdTokenDto,
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.loginWithLiffToken(body.idToken);

        // Only set cookie if login was successful (not needsRegistration)
        if ('accessToken' in result) {
            const refreshToken = await this.refreshTokenService.createRefreshToken(
                result.user.id,
                req.headers['user-agent'],
                req.ip,
            );
            res.cookie('refresh_token', refreshToken, this.getCookieOptions());
        }

        return result;
    }

    // =========================================
    // Google OAuth 端點
    // =========================================

    /**
     * Google OAuth Callback
     * 前端重導向回來時，用 authorization code 換取 access token
     */
    // 限流：10/min per IP —— OAuth code 交換（同 line/callback 理由）
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('google/callback')
    async googleCallback(
        @Body() body: OAuthCallbackDto,
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.exchangeGoogleCode(body.code, body.redirectUri);

        // Only set cookie if login was successful (not needsRegistration)
        if ('accessToken' in result) {
            const refreshToken = await this.refreshTokenService.createRefreshToken(
                result.user.id,
                req.headers['user-agent'],
                req.ip,
            );
            res.cookie('refresh_token', refreshToken, this.getCookieOptions());
        }

        return result;
    }

    /**
     * Google 登入
     * 前端透過 Google SDK 取得 access token 後呼叫此 API
     */
    // 限流：10/min per IP —— 社群登入（access token 交換）
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('google/login')
    async loginWithGoogle(
        @Body() body: OAuthAccessTokenDto,
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.loginWithGoogle(body.accessToken);

        // Only set cookie if login was successful (not needsRegistration)
        if ('accessToken' in result) {
            const refreshToken = await this.refreshTokenService.createRefreshToken(
                result.user.id,
                req.headers['user-agent'],
                req.ip,
            );
            res.cookie('refresh_token', refreshToken, this.getCookieOptions());
        }

        return result;
    }

    /**
     * Google 註冊新帳號
     * 若 Google 帳號未綁定，使用此 API 建立新帳號
     */
    // 限流：5/min per IP —— 建帳號路徑，與 /auth/register 同級
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('google/register')
    async registerWithGoogle(@Body() body: GoogleRegisterDto) {
        return this.authService.registerWithGoogle(body.accessToken, body.displayName);
    }

    /**
     * 綁定 Google 帳號
     * 已登入用戶綁定 Google 帳號
     */
    @Post('google/bind')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async bindGoogle(@Request() req: { user: { id: string } }, @Body() body: OAuthAccessTokenDto) {
        const googleProfile = await this.authService.verifyGoogleToken(body.accessToken);
        await this.authService.bindGoogleAccount(req.user.id, googleProfile.id, googleProfile.email);
        return { success: true, googleEmail: googleProfile.email };
    }

    /**
     * 綁定 Google 帳號 (OAuth Callback 版本)
     * 從 OAuth 回調中用 code 換取 token 並綁定
     */
    @Post('google/bind-callback')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async bindGoogleCallback(
        @Request() req: { user: { id: string } },
        @Body() body: OAuthCallbackDto
    ) {
        // 使用 code 換取 access token
        const accessToken = await this.authService.exchangeGoogleCodeForToken(body.code, body.redirectUri);
        // 驗證並綁定
        const googleProfile = await this.authService.verifyGoogleToken(accessToken);
        await this.authService.bindGoogleAccount(req.user.id, googleProfile.id, googleProfile.email);
        return { success: true, googleEmail: googleProfile.email };
    }


    // =========================================
    // Firebase Token 登入端點
    // =========================================

    /**
     * Firebase Token 登入
     * 前端透過 Firebase SDK 取得 ID Token 後呼叫此 API
     * 用於 Email/Password 和 Google Popup 登入方式
     */
    // 限流：10/min per IP —— Firebase ID Token 登入（含 Email/Password popup 流程）
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('firebase/login')
    async loginWithFirebaseToken(
        @Body() body: IdTokenDto,
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.loginWithFirebaseToken(body.idToken);

        // Generate and set refresh token cookie
        const refreshToken = await this.refreshTokenService.createRefreshToken(
            result.user.id,
            req.headers['user-agent'],
            req.ip,
        );

        res.cookie('refresh_token', refreshToken, this.getCookieOptions());

        return result;
    }

    // =========================================
    // 個人資料管理端點
    // =========================================

    /**
     * 更新個人資料
     */
    @Patch('profile')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async updateProfile(
        @Request() req: { user: { id: string } },
        @Body() dto: UpdateProfileDto
    ) {
        return this.accountManagementService.updateProfile(req.user.id, dto);
    }

    /**
     * 變更密碼
     */
    // 限流：5/min —— 需帶現行密碼，防已竊 token 者暴力猜舊密碼
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('change-password')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async changePassword(
        @Request() req: { user: { id: string } },
        @Body() dto: ChangePasswordDto
    ) {
        return this.accountManagementService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
    }

    /**
     * 設定密碼（針對 OAuth 帳號）
     * 只有透過 LINE/Google 登入且尚未設定密碼的帳號可用
     */
    // 限流：5/min —— 帳號接管敏感操作
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('set-password')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async setPassword(
        @Request() req: { user: { id: string } },
        @Body() body: SetPasswordDto
    ) {
        return this.accountManagementService.setPassword(req.user.id, body.newPassword);
    }

    /**
     * 檢查是否已設定密碼
     */
    @Get('has-password')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async hasPassword(@Request() req: { user: { id: string } }) {
        return this.accountManagementService.hasPassword(req.user.id);
    }

    /**
     * 獲取通知偏好設定
     */
    @Get('preferences')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async getPreferences(@Request() req: { user: { id: string } }) {
        return this.accountManagementService.getPreferences(req.user.id);
    }

    /**
     * 更新通知偏好設定
     */
    @Patch('preferences')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async updatePreferences(
        @Request() req: { user: { id: string } },
        @Body() dto: UpdatePreferencesDto
    ) {
        return this.accountManagementService.updatePreferences(req.user.id, dto);
    }

    // =========================================
    // OTP 驗證端點
    // =========================================

    /**
     * 發送手機 OTP 驗證碼 (SMS - 備用)
     */
    // 限流：5/min per IP —— OTP 發送，防簡訊轟炸與計費濫用
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('send-otp')
    async sendPhoneOtp(@Body() body: SendPhoneOtpDto) {
        return this.authService.sendPhoneOtp(body.phone);
    }

    /**
     * 發送 LINE OTP 驗證碼
     */
    // 限流：5/min —— OTP 發送，防訊息轟炸
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('send-line-otp')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async sendLineOtp(@Request() req: { user: { lineUserId?: string } }) {
        if (!req.user.lineUserId) {
            throw new BadRequestException('請先綁定 LINE 帳號');
        }
        return this.authService.sendLineOtp(req.user.lineUserId);
    }

    /**
     * 驗證 LINE OTP
     */
    // 限流：5/min —— OTP 驗證，防 6 位數驗證碼窮舉
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('verify-line-otp')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async verifyLineOtp(
        @Request() req: { user: { lineUserId?: string } },
        @Body() body: VerifyOtpCodeDto
    ) {
        if (!req.user.lineUserId) {
            throw new BadRequestException('請先綁定 LINE 帳號');
        }
        return this.authService.verifyLineOtp(req.user.lineUserId, body.code);
    }

    /**
     * 驗證手機 OTP
     */
    // 限流：5/min per IP —— OTP 驗證，防驗證碼窮舉
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('verify-otp')
    async verifyPhoneOtp(@Body() body: VerifyPhoneOtpDto) {
        return this.authService.verifyPhoneOtp(body.phone, body.code);
    }

    /**
     * 發送 Email OTP 驗證碼
     */
    // 限流：5/min per IP —— OTP 發送，防 email 轟炸與寄信配額濫用
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('send-email-otp')
    async sendEmailOtp(@Body() body: EmailOnlyDto) {
        return this.authService.sendEmailOtp(body.email);
    }

    /**
     * 驗證 Email OTP
     */
    // 限流：5/min per IP —— OTP 驗證，防驗證碼窮舉
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('verify-email-otp')
    async verifyEmailOtp(@Body() body: VerifyEmailOtpDto) {
        return this.authService.verifyEmailOtp(body.email, body.code);
    }

    /**
     * 發送自訂 Email 驗證信（使用 Resend）
     * 連結將使用 lightkeepers.ngo 網域
     */
    // 限流：5/min per IP —— 觸發外部寄信，防濫發
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('send-custom-verification')
    async sendCustomVerificationEmail(@Body() body: SendVerificationEmailDto) {
        return this.authService.sendCustomVerificationEmail(body.email, body.displayName);
    }

    /**
     * 重新發送驗證信
     */
    // 限流：5/min per IP —— 觸發外部寄信，防濫發
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('resend-verification')
    async resendVerificationEmail(@Body() body: SendVerificationEmailDto) {
        return this.authService.sendCustomVerificationEmail(body.email, body.displayName);
    }

    /**
     * 檢查 Email 驗證狀態
     * 用於 Firebase 驗證連結後的狀態同步
     */
    // 限流：30/min per IP —— 前端輪詢驗證狀態，屬查詢類
    //
    // P0 輸入驗證修正：原本是 `@Get` 搭配 `@Body()`。GET 請求在瀏覽器／axios 下不帶 body，
    // 因此 `email` 恆為 undefined，而 `findOne({ where: { email: undefined } })` 在 TypeORM
    // 會**忽略該條件**，回傳資料表中任意一筆帳號的驗證狀態。改為 `@Query()` + DTO：
    // 參數確實可被送達，且 email 必填並經格式驗證。全庫查無呼叫端，無前端相依。
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @Get('check-email-verification')
    async checkEmailVerification(@Query() query: EmailOnlyDto) {
        return this.authService.checkEmailVerificationStatus(query.email);
    }

    // =========================================
    // 密碼重設端點
    // =========================================

    /**
     * 忘記密碼 - 發送重設連結
     * @Public - No auth required
     */
    @Public()
    // 限流：5/min per IP —— 覆核：合理。觸發外部寄信＋帳號列舉探測面
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('forgot-password')
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.requestPasswordReset(body.email, body.phone);
    }

    /**
     * 重設密碼
     * @Public - No auth required (uses reset token for verification)
     */
    @Public()
    // 限流：5/min per IP —— 覆核：合理。防重設 token 窮舉
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }

    // =========================================
    // 帳號狀態端點
    // =========================================

    /**
     * 獲取帳號完整狀態（包含審核狀態和志工資料狀態）
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @Get('me/status')
    async getAccountStatus(@Request() req: { user: { id: string } }) {
        return this.accountManagementService.getAccountStatus(req.user.id);
    }

    /**
     * 標記志工資料已完成
     */
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @Post('me/volunteer-profile-completed')
    async markVolunteerProfileCompleted(@Request() req: { user: { id: string } }) {
        return this.accountManagementService.markVolunteerProfileCompleted(req.user.id);
    }

    // =========================================
    // Refresh Token Endpoints
    // =========================================

    /**
     * Refresh access token using httpOnly cookie
     * POST /auth/refresh
     * @Public - No JWT required, validated via refresh token cookie
     * 
     * Cookie: refresh_token=<token>
     * Returns: new accessToken
     */
    @Public()
    // 限流：30/min per IP —— 覆核：維持。多分頁／多裝置會正常併發換發，
    // 過嚴會誤傷正常使用；refresh token 本身為高熵值，窮舉不可行。
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @Post('refresh')
    async refreshToken(
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        // Get refresh token from cookie
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException({
                message: 'No refresh token provided',
                code: 'NO_REFRESH_TOKEN',
            });
        }

        // Validate and get account ID
        const accountId = await this.refreshTokenService.validateRefreshToken(refreshToken);

        if (!accountId) {
            // Clear invalid cookie
            res.clearCookie('refresh_token', this.getCookieOptions());
            throw new UnauthorizedException({
                message: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN',
            });
        }

        // Generate new access token
        const tokenResponse = await this.authService.generateTokenForAccountId(accountId);

        return {
            accessToken: tokenResponse.accessToken,
            expiresIn: tokenResponse.expiresIn,
            user: tokenResponse.user,
        };
    }

    /**
     * Logout - revoke refresh token and clear cookie
     * POST /auth/logout
     */
    @Post('logout')
    async logout(
        @Request() req: RequestWithCookies,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.refresh_token;

        if (refreshToken) {
            await this.refreshTokenService.revokeToken(refreshToken);
        }

        // Clear the cookie
        res.clearCookie('refresh_token', this.getCookieOptions());

        return { success: true, message: 'Logged out successfully' };
    }

    /**
     * Get active sessions for current user
     * GET /auth/sessions
     */
    @Get('sessions')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async getSessions(@Request() req: { user: { id: string } }) {
        const sessions = await this.refreshTokenService.getActiveSessions(req.user.id);
        return { success: true, data: sessions };
    }

    /**
     * Revoke a specific session
     * DELETE /auth/sessions/:id
     */
    @Delete('sessions/:id')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async revokeSession(
        @Request() req: { user: { id: string } },
        @Param('id') sessionId: string,
    ) {
        const revoked = await this.refreshTokenService.revokeSession(req.user.id, sessionId);

        if (!revoked) {
            throw new BadRequestException('Session not found or already revoked');
        }

        return { success: true, message: 'Session revoked' };
    }

    /**
     * Logout from all devices (revoke all refresh tokens)
     * POST /auth/logout-all
     */
    @Post('logout-all')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    async logoutAll(
        @Request() req: { user: { id: string } },
        @Res({ passthrough: true }) res: Response,
    ) {
        const count = await this.refreshTokenService.revokeAllTokens(req.user.id);

        // Clear current session cookie
        res.clearCookie('refresh_token', this.getCookieOptions());

        return { success: true, message: `Logged out from ${count} devices` };
    }

    /**
     * Helper method to get consistent cookie options
     */
    private getCookieOptions() {
        const isProduction = process.env.NODE_ENV === 'production';
        return {
            httpOnly: true,
            secure: isProduction, // Required for sameSite: 'none'
            // Use 'none' for cross-origin (frontend: lightkeepers.ngo, backend: run.app)
            // 'strict' blocks cookies on cross-site requests
            sameSite: isProduction ? 'none' as const : 'lax' as const,
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        };
    }
}
