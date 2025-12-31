import { Controller, Post, Body, Get, Patch, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto, UpdatePreferencesDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req: { user: { id: string; email?: string; phone?: string; displayName?: string; lineUserId?: string; roles?: { name: string; level: number; displayName: string }[] } }) {
        const roles = req.user.roles || [];
        const roleLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level || 0)) : 0;

        return {
            id: req.user.id,
            email: req.user.email,
            phone: req.user.phone,
            displayName: req.user.displayName,
            lineLinked: !!req.user.lineUserId,
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

    /**
     * LINE OAuth Callback
     * 前端重導向回來時，用 authorization code 換取 access token
     */
    @Post('line/callback')
    async lineCallback(@Body() body: { code: string; redirectUri: string }) {
        return this.authService.exchangeLineCode(body.code, body.redirectUri);
    }

    /**
     * LINE 登入
     * 前端透過 LINE SDK 取得 access token 後呼叫此 API
     */
    @Post('line/login')
    async loginWithLine(@Body() body: { accessToken: string }) {
        return this.authService.loginWithLine(body.accessToken);
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
     * LIFF Token 登入
     * 前端在 LINE App 內透過 LIFF SDK 取得 ID Token 後呼叫此 API
     * 用於 SSO 無縫登入體驗
     */
    @Post('liff/login')
    async loginWithLiffToken(@Body() body: { idToken: string }) {
        return this.authService.loginWithLiffToken(body.idToken);
    }

    // =========================================
    // Google OAuth 端點
    // =========================================

    /**
     * Google OAuth Callback
     * 前端重導向回來時，用 authorization code 換取 access token
     */
    @Post('google/callback')
    async googleCallback(@Body() body: { code: string; redirectUri: string }) {
        return this.authService.exchangeGoogleCode(body.code, body.redirectUri);
    }

    /**
     * Google 登入
     * 前端透過 Google SDK 取得 access token 後呼叫此 API
     */
    @Post('google/login')
    async loginWithGoogle(@Body() body: { accessToken: string }) {
        return this.authService.loginWithGoogle(body.accessToken);
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

    // =========================================
    // Firebase Token 登入端點
    // =========================================

    /**
     * Firebase Token 登入
     * 前端透過 Firebase SDK 取得 ID Token 後呼叫此 API
     * 用於 Email/Password 和 Google Popup 登入方式
     */
    @Post('firebase/login')
    async loginWithFirebaseToken(@Body() body: { idToken: string }) {
        return this.authService.loginWithFirebaseToken(body.idToken);
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
     */
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
}
