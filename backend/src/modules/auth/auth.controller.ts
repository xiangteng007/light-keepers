import { Controller, Post, Body, Get, Patch, Delete, Param, UseGuards, Request, Res, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto, UpdatePreferencesDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly refreshTokenService: RefreshTokenService,
    ) { }

    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Public()
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('login')
    async login(
        @Body() dto: LoginDto,
        @Request() req: any,
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
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req: { user: { id: string; email?: string; phone?: string; displayName?: string; lineUserId?: string; googleId?: string; roles?: { name: string; level: number; displayName: string }[] } }) {
        // 從資料庫獲取最新帳號資料（包含綁定狀態）
        const account = await this.authService.getAccountById(req.user.id);
        const roles = req.user.roles || [];
        const roleLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level || 0)) : 0;

        return {
            id: req.user.id,
            email: req.user.email,
            phone: req.user.phone,
            displayName: account?.displayName || req.user.displayName,
            avatarUrl: account?.avatarUrl || null,
            lineLinked: !!(account?.lineUserId),
            googleLinked: !!(account?.googleId),
            volunteerProfileCompleted: account?.volunteerProfileCompleted || false,
            roles: roles.map(r => r.name),
            roleLevel,
            roleDisplayName: roles.find(r => r.level === roleLevel)?.displayName || '一般民眾',
        };
    }

    /**
     * 獲取頁面權限配置
     * 公開 API，用於前端判斷頁面可見性
     */
    @Get('permissions')
    async getPermissions() {
        return this.authService.getPagePermissions();
    }

    /**
     * 獲取所有角色
     * 公開 API，用於前端顯示角色資訊
     */
    @Get('roles')
    async getRoles() {
        return this.authService.getAllRoles();
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
    // 1. @UseGuards(JwtAuthGuard) + @RequiredLevel(5)
    // 2. Environment variable for admin key
    // 3. Audit logging
    // =========================================

    /**
     * LINE OAuth Callback
     * 前端重導向回來時，用 authorization code 換取 access token
     */
    @Post('line/callback')
    async lineCallback(
        @Body() body: { code: string; redirectUri: string },
        @Request() req: any,
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
    @Post('line/login')
    async loginWithLine(
        @Body() body: { accessToken: string },
        @Request() req: any,
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
    @Post('line/register')
    async registerWithLine(@Body() body: { accessToken: string; displayName: string; email?: string; phone?: string }) {
        return this.authService.registerWithLine(body.accessToken, body.displayName, body.email, body.phone);
    }

    /**
     * 綁定 LINE 帳號
     * 已登入用戶綁定 LINE 帳號
     */
    @Post('line/bind')
    @UseGuards(JwtAuthGuard)
    async bindLine(@Request() req: { user: { id: string } }, @Body() body: { accessToken: string }) {
        const lineProfile = await this.authService.verifyLineToken(body.accessToken);
        await this.authService.bindLineAccount(req.user.id, lineProfile.userId, lineProfile.displayName);
        return { success: true, lineDisplayName: lineProfile.displayName };
    }

    /**
     * 綁定 LINE 帳號 (OAuth Callback 版本)
     * 從 OAuth 回調中用 code 換取 token 並綁定
     */
    @Post('line/bind-callback')
    @UseGuards(JwtAuthGuard)
    async bindLineCallback(
        @Request() req: { user: { id: string } },
        @Body() body: { code: string; redirectUri: string }
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
    @Post('liff/login')
    async loginWithLiffToken(
        @Body() body: { idToken: string },
        @Request() req: any,
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
    @Post('google/callback')
    async googleCallback(
        @Body() body: { code: string; redirectUri: string },
        @Request() req: any,
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
    @Post('google/login')
    async loginWithGoogle(
        @Body() body: { accessToken: string },
        @Request() req: any,
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
    @Post('google/register')
    async registerWithGoogle(@Body() body: { accessToken: string; displayName?: string }) {
        return this.authService.registerWithGoogle(body.accessToken, body.displayName);
    }

    /**
     * 綁定 Google 帳號
     * 已登入用戶綁定 Google 帳號
     */
    @Post('google/bind')
    @UseGuards(JwtAuthGuard)
    async bindGoogle(@Request() req: { user: { id: string } }, @Body() body: { accessToken: string }) {
        const googleProfile = await this.authService.verifyGoogleToken(body.accessToken);
        await this.authService.bindGoogleAccount(req.user.id, googleProfile.id, googleProfile.email);
        return { success: true, googleEmail: googleProfile.email };
    }

    /**
     * 綁定 Google 帳號 (OAuth Callback 版本)
     * 從 OAuth 回調中用 code 換取 token 並綁定
     */
    @Post('google/bind-callback')
    @UseGuards(JwtAuthGuard)
    async bindGoogleCallback(
        @Request() req: { user: { id: string } },
        @Body() body: { code: string; redirectUri: string }
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
    @Post('firebase/login')
    async loginWithFirebaseToken(
        @Body() body: { idToken: string },
        @Request() req: any,
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
    @UseGuards(JwtAuthGuard)
    async updateProfile(
        @Request() req: { user: { id: string } },
        @Body() dto: UpdateProfileDto
    ) {
        return this.authService.updateProfile(req.user.id, dto);
    }

    /**
     * 變更密碼
     */
    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    async changePassword(
        @Request() req: { user: { id: string } },
        @Body() dto: ChangePasswordDto
    ) {
        return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
    }

    /**
     * 設定密碼（針對 OAuth 帳號）
     * 只有透過 LINE/Google 登入且尚未設定密碼的帳號可用
     */
    @Post('set-password')
    @UseGuards(JwtAuthGuard)
    async setPassword(
        @Request() req: { user: { id: string } },
        @Body() body: { newPassword: string }
    ) {
        return this.authService.setPassword(req.user.id, body.newPassword);
    }

    /**
     * 檢查是否已設定密碼
     */
    @Get('has-password')
    @UseGuards(JwtAuthGuard)
    async hasPassword(@Request() req: { user: { id: string } }) {
        return this.authService.hasPassword(req.user.id);
    }

    /**
     * 獲取通知偏好設定
     */
    @Get('preferences')
    @UseGuards(JwtAuthGuard)
    async getPreferences(@Request() req: { user: { id: string } }) {
        return this.authService.getPreferences(req.user.id);
    }

    /**
     * 更新通知偏好設定
     */
    @Patch('preferences')
    @UseGuards(JwtAuthGuard)
    async updatePreferences(
        @Request() req: { user: { id: string } },
        @Body() dto: UpdatePreferencesDto
    ) {
        return this.authService.updatePreferences(req.user.id, dto);
    }

    // =========================================
    // OTP 驗證端點
    // =========================================

    /**
     * 發送手機 OTP 驗證碼 (SMS - 備用)
     */
    @Post('send-otp')
    async sendPhoneOtp(@Body() body: { phone: string }) {
        return this.authService.sendPhoneOtp(body.phone);
    }

    /**
     * 發送 LINE OTP 驗證碼
     */
    @Post('send-line-otp')
    @UseGuards(JwtAuthGuard)
    async sendLineOtp(@Request() req: { user: { lineUserId?: string } }) {
        if (!req.user.lineUserId) {
            throw new BadRequestException('請先綁定 LINE 帳號');
        }
        return this.authService.sendLineOtp(req.user.lineUserId);
    }

    /**
     * 驗證 LINE OTP
     */
    @Post('verify-line-otp')
    @UseGuards(JwtAuthGuard)
    async verifyLineOtp(
        @Request() req: { user: { lineUserId?: string } },
        @Body() body: { code: string }
    ) {
        if (!req.user.lineUserId) {
            throw new BadRequestException('請先綁定 LINE 帳號');
        }
        return this.authService.verifyLineOtp(req.user.lineUserId, body.code);
    }

    /**
     * 驗證手機 OTP
     */
    @Post('verify-otp')
    async verifyPhoneOtp(@Body() body: { phone: string; code: string }) {
        return this.authService.verifyPhoneOtp(body.phone, body.code);
    }

    /**
     * 發送 Email OTP 驗證碼
     */
    @Post('send-email-otp')
    async sendEmailOtp(@Body() body: { email: string }) {
        return this.authService.sendEmailOtp(body.email);
    }

    /**
     * 驗證 Email OTP
     */
    @Post('verify-email-otp')
    async verifyEmailOtp(@Body() body: { email: string; code: string }) {
        return this.authService.verifyEmailOtp(body.email, body.code);
    }

    /**
     * 發送自訂 Email 驗證信（使用 Resend）
     * 連結將使用 lightkeepers.ngo 網域
     */
    @Post('send-custom-verification')
    async sendCustomVerificationEmail(@Body() body: { email: string; displayName?: string }) {
        return this.authService.sendCustomVerificationEmail(body.email, body.displayName);
    }

    /**
     * 重新發送驗證信
     */
    @Post('resend-verification')
    async resendVerificationEmail(@Body() body: { email: string; displayName?: string }) {
        return this.authService.sendCustomVerificationEmail(body.email, body.displayName);
    }

    /**
     * 檢查 Email 驗證狀態
     * 用於 Firebase 驗證連結後的狀態同步
     */
    @Get('check-email-verification')
    async checkEmailVerification(@Body() body: { email: string }) {
        return this.authService.checkEmailVerificationStatus(body.email);
    }

    // =========================================
    // 密碼重設端點
    // =========================================

    /**
     * 忘記密碼 - 發送重設連結
     * @Public - No auth required
     */
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('forgot-password')
    async forgotPassword(@Body() body: { email?: string; phone?: string }) {
        return this.authService.requestPasswordReset(body.email, body.phone);
    }

    /**
     * 重設密碼
     */
    @Post('reset-password')
    async resetPassword(@Body() body: { token: string; newPassword: string }) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }

    // =========================================
    // 帳號狀態端點
    // =========================================

    /**
     * 獲取帳號完整狀態（包含審核狀態和志工資料狀態）
     */
    @Get('me/status')
    @UseGuards(JwtAuthGuard)
    async getAccountStatus(@Request() req: { user: { id: string } }) {
        return this.authService.getAccountStatus(req.user.id);
    }

    /**
     * 標記志工資料已完成
     */
    @Post('me/volunteer-profile-completed')
    @UseGuards(JwtAuthGuard)
    async markVolunteerProfileCompleted(@Request() req: { user: { id: string } }) {
        return this.authService.markVolunteerProfileCompleted(req.user.id);
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
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @Post('refresh')
    async refreshToken(
        @Request() req: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        // Get refresh token from cookie
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException('No refresh token provided');
        }

        // Validate and get account ID
        const accountId = await this.refreshTokenService.validateRefreshToken(refreshToken);

        if (!accountId) {
            // Clear invalid cookie
            res.clearCookie('refresh_token', this.getCookieOptions());
            throw new UnauthorizedException('Invalid or expired refresh token');
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
        @Request() req: any,
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
    @UseGuards(JwtAuthGuard)
    async getSessions(@Request() req: { user: { id: string } }) {
        const sessions = await this.refreshTokenService.getActiveSessions(req.user.id);
        return { success: true, data: sessions };
    }

    /**
     * Revoke a specific session
     * DELETE /auth/sessions/:id
     */
    @Delete('sessions/:id')
    @UseGuards(JwtAuthGuard)
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
    @UseGuards(JwtAuthGuard)
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
