import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Account, Role, PagePermission } from '../accounts/entities';
import { RegisterDto, LoginDto, TokenResponseDto } from './dto/auth.dto';
import { OtpService } from './services/otp.service';
import { SmsService } from './services/sms.service';
import { PasswordResetService } from './services/password-reset.service';
import { EmailService } from './services/email.service';
import { FirebaseAdminService } from './services/firebase-admin.service';
import { LineBotService } from '../line-bot/line-bot.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(PagePermission)
        private readonly pagePermissionRepository: Repository<PagePermission>,
        private readonly jwtService: JwtService,
        private readonly otpService: OtpService,
        private readonly smsService: SmsService,
        private readonly passwordResetService: PasswordResetService,
        private readonly emailService: EmailService,
        private readonly firebaseAdminService: FirebaseAdminService,
        private readonly lineBotService: LineBotService,
    ) { }

    /**
     * 獲取帳號資料（含綁定狀態）
     */
    async getAccountById(id: string): Promise<Account | null> {
        return this.accountRepository.findOne({
            where: { id },
            select: ['id', 'email', 'phone', 'displayName', 'avatarUrl', 'lineUserId', 'googleId'],
        });
    }

    async register(dto: RegisterDto): Promise<TokenResponseDto> {
        // 驗證 email 或 phone 必須存在
        if (!dto.email && !dto.phone) {
            throw new ConflictException('Email 或手機號碼為必填');
        }

        // 檢查是否已存在
        const existing = await this.accountRepository.findOne({
            where: [
                { email: dto.email },
                { phone: dto.phone },
            ].filter(w => Object.values(w).some(v => v)),
        });

        if (existing) {
            throw new ConflictException('帳號已存在');
        }

        // 密碼加密
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // 取得預設志工角色 (Level 1)
        // 註冊成功後自動成為志願者，符合新的權限設計
        const volunteerRole = await this.roleRepository.findOne({
            where: { name: 'volunteer' },
        });

        // 建立帳號並自動分配 volunteer 角色 (Level 1)
        const account = this.accountRepository.create({
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            displayName: dto.displayName,
            roles: volunteerRole ? [volunteerRole] : [],  // 自動分配 Level 1
        });

        await this.accountRepository.save(account);

        return this.generateTokenResponse(account);
    }

    async login(dto: LoginDto): Promise<TokenResponseDto> {
        const account = await this.accountRepository.findOne({
            where: [
                { email: dto.email },
                { phone: dto.phone },
            ].filter(w => Object.values(w).some(v => v)),
            relations: ['roles'],
        });

        if (!account) {
            throw new UnauthorizedException('帳號或密碼錯誤');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, account.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('帳號或密碼錯誤');
        }

        // 更新最後登入時間（使用 update 避免清空 roles 關聯）
        await this.accountRepository.update(account.id, { lastLoginAt: new Date() });

        return this.generateTokenResponse(account);
    }

    async validateToken(token: string): Promise<Account | null> {
        try {
            const payload = this.jwtService.verify(token);
            return this.accountRepository.findOne({
                where: { id: payload.sub },
                relations: ['roles'],
            });
        } catch {
            return null;
        }
    }

    /**
     * LINE Login Callback - 用 authorization code 換取 access token
     */
    async exchangeLineCode(code: string, redirectUri: string): Promise<TokenResponseDto | { needsRegistration: true; lineProfile: { userId: string; displayName: string; pictureUrl?: string } }> {
        const lineAccessToken = await this.exchangeLineCodeForToken(code, redirectUri);
        // 使用取得的 access token 進行登入
        return this.loginWithLine(lineAccessToken);
    }

    /**
     * LINE Code 換取 Access Token (不登入，用於綁定)
     */
    async exchangeLineCodeForToken(code: string, redirectUri: string): Promise<string> {
        const clientId = process.env.LINE_CLIENT_ID;
        const clientSecret = process.env.LINE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new UnauthorizedException('LINE Login 尚未設定');
        }

        // 用 code 換取 access token
        const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error('LINE token exchange failed:', error);
            throw new UnauthorizedException('LINE 登入失敗');
        }

        const tokenData = await tokenResponse.json();
        return tokenData.access_token;
    }

    /**
     * LINE Login - 驗證 LINE Access Token 並獲取用戶資訊
     */
    async verifyLineToken(accessToken: string): Promise<{ userId: string; displayName: string; pictureUrl?: string }> {
        const response = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new UnauthorizedException('LINE Token 驗證失敗');
        }

        const profile = await response.json();
        return {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
        };
    }

    /**
     * LINE Login - 使用 LINE 帳號登入
     */
    async loginWithLine(lineAccessToken: string): Promise<TokenResponseDto | { needsRegistration: true; lineProfile: { userId: string; displayName: string; pictureUrl?: string } }> {
        // 驗證 LINE Token
        const lineProfile = await this.verifyLineToken(lineAccessToken);

        // 查找已綁定的帳號
        const account = await this.accountRepository.findOne({
            where: { lineUserId: lineProfile.userId },
            relations: ['roles'],
        });

        if (account) {
            // 已綁定 - 直接登入（使用 update 避免清空 roles 關聯）
            await this.accountRepository.update(account.id, { lastLoginAt: new Date() });
            return this.generateTokenResponse(account);
        }

        // 未綁定 - 返回需要註冊/綁定
        return {
            needsRegistration: true,
            lineProfile,
        };
    }

    /**
     * LIFF Token 登入 - 使用 LIFF SDK 取得的 ID Token 進行認證
     * 用於 LINE App 內的無縫 SSO 登入體驗
     */
    async loginWithLiffToken(idToken: string): Promise<TokenResponseDto | { needsRegistration: true; lineProfile: { userId: string; displayName: string; pictureUrl?: string } }> {
        // 驗證 LIFF ID Token
        const liffProfile = await this.verifyLiffIdToken(idToken);

        // 查找已綁定的帳號
        const account = await this.accountRepository.findOne({
            where: { lineUserId: liffProfile.userId },
            relations: ['roles'],
        });

        if (account) {
            // 已綁定 - 直接登入（使用 update 避免清空 roles 關聯）
            const updateData: Partial<Account> = { lastLoginAt: new Date() };
            // 更新頭像和顯示名稱（如果有變更）
            if (liffProfile.pictureUrl && account.avatarUrl !== liffProfile.pictureUrl) {
                updateData.avatarUrl = liffProfile.pictureUrl;
            }
            if (liffProfile.displayName && account.lineDisplayName !== liffProfile.displayName) {
                updateData.lineDisplayName = liffProfile.displayName;
            }
            await this.accountRepository.update(account.id, updateData);
            return this.generateTokenResponse(account);
        }

        // 未綁定 - 自動建立新帳號（LIFF 登入假設使用者信任 LINE 身份）
        // 取得志工角色以分配 Level 1
        const volunteerRole = await this.roleRepository.findOne({
            where: { name: 'volunteer' },
        });

        const newAccount = this.accountRepository.create({
            passwordHash: '', // LIFF 登入不需要密碼
            displayName: liffProfile.displayName,
            avatarUrl: liffProfile.pictureUrl,
            lineUserId: liffProfile.userId,
            lineDisplayName: liffProfile.displayName,
            roles: volunteerRole ? [volunteerRole] : [],  // 自動分配 Level 1
        });

        await this.accountRepository.save(newAccount);
        return this.generateTokenResponse(newAccount);
    }

    /**
     * 驗證 LIFF ID Token
     * 使用 LINE API 驗證 ID Token 的有效性並解碼用戶資訊
     */
    async verifyLiffIdToken(idToken: string): Promise<{ userId: string; displayName: string; pictureUrl?: string }> {
        const clientId = process.env.LINE_CLIENT_ID;

        if (!clientId) {
            throw new UnauthorizedException('LINE Login 尚未設定');
        }

        // 使用 LINE Verify API 驗證 ID Token
        const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                id_token: idToken,
                client_id: clientId,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('LIFF ID Token verification failed:', error);
            throw new UnauthorizedException('LIFF Token 驗證失敗');
        }

        const decodedToken = await response.json();

        // 從解碼後的 Token 取得用戶資訊
        // LIFF ID Token 包含：sub (userId), name, picture 等
        return {
            userId: decodedToken.sub,
            displayName: decodedToken.name || 'LINE User',
            pictureUrl: decodedToken.picture,
        };
    }

    /**
     * 綁定 LINE 帳號到現有帳號
     */
    async bindLineAccount(accountId: string, lineUserId: string, lineDisplayName: string): Promise<void> {
        // 檢查 LINE 是否已被其他帳號綁定
        const existing = await this.accountRepository.findOne({ where: { lineUserId } });
        if (existing && existing.id !== accountId) {
            throw new ConflictException('此 LINE 帳號已被其他帳號綁定');
        }

        await this.accountRepository.update(accountId, {
            lineUserId,
            lineDisplayName,
        });
    }

    /**
     * 使用 LINE 註冊新帳號
     */
    async registerWithLine(lineAccessToken: string, displayName: string, email?: string, phone?: string): Promise<TokenResponseDto> {
        const lineProfile = await this.verifyLineToken(lineAccessToken);

        // 檢查 LINE 是否已綁定
        const existingLine = await this.accountRepository.findOne({ where: { lineUserId: lineProfile.userId } });
        if (existingLine) {
            throw new ConflictException('此 LINE 帳號已註冊');
        }

        // 取得志工角色以分配 Level 1
        const volunteerRole = await this.roleRepository.findOne({
            where: { name: 'volunteer' },
        });

        // 建立帳號並自動分配 volunteer 角色 (Level 1)
        const account = this.accountRepository.create({
            email: email || undefined,
            phone: phone || undefined,
            passwordHash: '', // LINE 登入不需要密碼
            displayName: displayName || lineProfile.displayName,
            avatarUrl: lineProfile.pictureUrl,
            lineUserId: lineProfile.userId,
            lineDisplayName: lineProfile.displayName,
            roles: volunteerRole ? [volunteerRole] : [],  // 自動分配 Level 1
        });

        await this.accountRepository.save(account);
        return this.generateTokenResponse(account);
    }

    /**
     * 獲取頁面權限配置
     */
    async getPagePermissions(): Promise<PagePermission[]> {
        return this.pagePermissionRepository.find({
            where: { isVisible: true },
            order: { sortOrder: 'ASC' },
        });
    }

    /**
     * 獲取所有角色
     */
    async getAllRoles(): Promise<Role[]> {
        return this.roleRepository.find({
            order: { level: 'ASC' },
        });
    }

    /**
     * 診斷帳號狀態（臨時方法）
     * 用於排查角色問題
     */
    async diagnoseAccount(email: string): Promise<any> {
        // 搜尋所有可能的帳號
        const accounts = await this.accountRepository.find({
            where: [
                { email },
                { googleEmail: email },
            ],
            relations: ['roles'],
        });

        return {
            searchEmail: email,
            accountCount: accounts.length,
            accounts: accounts.map(acc => ({
                id: acc.id,
                email: acc.email,
                googleEmail: acc.googleEmail,
                firebaseUid: acc.firebaseUid,
                displayName: acc.displayName,
                roles: acc.roles?.map(r => ({ name: r.name, level: r.level })) || [],
                roleLevel: acc.roles?.length ? Math.max(...acc.roles.map(r => r.level)) : 0,
                lastLoginAt: acc.lastLoginAt,
            })),
        };
    }

    // =========================================
    // Google OAuth 相關方法
    // =========================================

    /**
     * Google OAuth Callback - 用 authorization code 換取 access token
     */
    async exchangeGoogleCode(code: string, redirectUri: string): Promise<TokenResponseDto | { needsRegistration: true; googleProfile: { id: string; email: string; name: string; picture?: string } }> {
        const googleAccessToken = await this.exchangeGoogleCodeForToken(code, redirectUri);
        // 使用取得的 access token 進行登入
        return this.loginWithGoogle(googleAccessToken);
    }

    /**
     * Google Code 換取 Access Token (不登入，用於綁定)
     */
    async exchangeGoogleCodeForToken(code: string, redirectUri: string): Promise<string> {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new UnauthorizedException('Google Login 尚未設定');
        }

        // 用 code 換取 access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error('Google token exchange failed:', error);
            throw new UnauthorizedException('Google 登入失敗');
        }

        const tokenData = await tokenResponse.json();
        return tokenData.access_token;
    }


    /**
     * Google Login - 驗證 Google Access Token 並獲取用戶資訊
     */
    async verifyGoogleToken(accessToken: string): Promise<{ id: string; email: string; name: string; picture?: string }> {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new UnauthorizedException('Google Token 驗證失敗');
        }

        const profile = await response.json();
        return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
        };
    }

    /**
     * Google Login - 使用 Google 帳號登入
     */
    async loginWithGoogle(googleAccessToken: string): Promise<TokenResponseDto | { needsRegistration: true; googleProfile: { id: string; email: string; name: string; picture?: string } }> {
        // 驗證 Google Token
        const googleProfile = await this.verifyGoogleToken(googleAccessToken);

        // 查找已綁定的帳號 (優先用 Google ID，其次用 email)
        let account = await this.accountRepository.findOne({
            where: { googleId: googleProfile.id },
            relations: ['roles'],
        });

        // 如果沒有綁定 Google ID，嘗試用 email 查找
        if (!account && googleProfile.email) {
            account = await this.accountRepository.findOne({
                where: { email: googleProfile.email },
                relations: ['roles'],
            });

            // 如果找到，自動綁定 Google ID（使用 update 避免清空 roles 關聯）
            if (account) {
                const bindData: Partial<Account> = {
                    googleId: googleProfile.id,
                    googleEmail: googleProfile.email,
                };
                if (!account.avatarUrl && googleProfile.picture) {
                    bindData.avatarUrl = googleProfile.picture;
                }
                await this.accountRepository.update(account.id, bindData);
            }
        }

        if (account) {
            // 已綁定 - 直接登入（使用 update 避免清空 roles 關聯）
            await this.accountRepository.update(account.id, { lastLoginAt: new Date() });
            return this.generateTokenResponse(account);
        }

        // 未綁定 - 返回需要註冊/綁定
        return {
            needsRegistration: true,
            googleProfile,
        };
    }

    /**
     * 綁定 Google 帳號到現有帳號
     */
    async bindGoogleAccount(accountId: string, googleId: string, googleEmail: string): Promise<void> {
        // 檢查 Google 是否已被其他帳號綁定
        const existing = await this.accountRepository.findOne({ where: { googleId } });
        if (existing && existing.id !== accountId) {
            throw new ConflictException('此 Google 帳號已被其他帳號綁定');
        }

        await this.accountRepository.update(accountId, {
            googleId,
            googleEmail,
        });
    }

    /**
     * 使用 Google 註冊新帳號
     */
    async registerWithGoogle(googleAccessToken: string, displayName?: string): Promise<TokenResponseDto> {
        const googleProfile = await this.verifyGoogleToken(googleAccessToken);

        // 檢查 Google 是否已綁定
        const existingGoogle = await this.accountRepository.findOne({ where: { googleId: googleProfile.id } });
        if (existingGoogle) {
            throw new ConflictException('此 Google 帳號已註冊');
        }

        // 檢查 email 是否已存在
        if (googleProfile.email) {
            const existingEmail = await this.accountRepository.findOne({ where: { email: googleProfile.email } });
            if (existingEmail) {
                throw new ConflictException('此 Email 已有帳號，請直接登入');
            }
        }

        // 取得志工角色以分配 Level 1
        const volunteerRole = await this.roleRepository.findOne({
            where: { name: 'volunteer' },
        });

        // 建立帳號並自動分配 volunteer 角色 (Level 1)
        const account = this.accountRepository.create({
            email: googleProfile.email || undefined,
            passwordHash: '', // Google 登入不需要密碼
            displayName: displayName || googleProfile.name,
            avatarUrl: googleProfile.picture,
            googleId: googleProfile.id,
            googleEmail: googleProfile.email,
            roles: volunteerRole ? [volunteerRole] : [],  // 自動分配 Level 1
        });

        await this.accountRepository.save(account);
        return this.generateTokenResponse(account);
    }

    /**
     * Firebase Token 登入
     * 驗證 Firebase ID Token 並尋找或建立對應帳號
     */
    async loginWithFirebaseToken(idToken: string): Promise<TokenResponseDto> {
        if (!this.firebaseAdminService.isConfigured()) {
            throw new UnauthorizedException('Firebase 尚未設定');
        }

        // 驗證 Firebase ID Token
        const decodedToken = await this.firebaseAdminService.verifyIdToken(idToken);
        if (!decodedToken) {
            throw new UnauthorizedException('Firebase Token 驗證失敗');
        }

        const { email, email_verified, name, picture, uid } = decodedToken;

        if (!email) {
            throw new UnauthorizedException('無法取得 Email 資訊');
        }

        // 尋找現有帳號（優先使用 Firebase UID，其次使用 email）
        let account = await this.accountRepository.findOne({
            where: [
                { firebaseUid: uid },
                { email },
            ],
            relations: ['roles'],
        });

        if (account) {
            // 使用 update 避免清空 roles 關聯
            const updateData: Partial<Account> = { lastLoginAt: new Date() };
            // 更新 Firebase UID（如果之前沒有）
            if (!account.firebaseUid) {
                updateData.firebaseUid = uid;
            }
            // 如果 Firebase 已驗證 Email，同步本地狀態
            if (email_verified && !account.emailVerified) {
                updateData.emailVerified = true;
            }
            await this.accountRepository.update(account.id, updateData);
            return this.generateTokenResponse(account);
        }

        // 取得志工角色以分配 Level 1
        const volunteerRole = await this.roleRepository.findOne({
            where: { name: 'volunteer' },
        });

        // 建立新帳號並自動分配 volunteer 角色 (Level 1)
        account = this.accountRepository.create({
            email,
            passwordHash: '', // Firebase 登入不需要密碼
            displayName: name || email.split('@')[0],
            avatarUrl: picture || undefined,
            firebaseUid: uid,
            emailVerified: email_verified || false,
            roles: volunteerRole ? [volunteerRole] : [],  // 自動分配 Level 1
        });

        await this.accountRepository.save(account);
        return this.generateTokenResponse(account);
    }

    /**
     * Generate token response for a given account (used by refresh token flow)
     */
    async generateTokenForAccountId(accountId: string): Promise<TokenResponseDto> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            relations: ['roles'],
        });

        if (!account) {
            throw new UnauthorizedException('Account not found');
        }

        return this.generateTokenResponse(account);
    }

    private generateTokenResponse(account: Account): TokenResponseDto {
        const roles = account.roles || [];
        const roleLevel = roles.length > 0 ? Math.max(...roles.map(r => (r as any).level || 0)) : 0;

        const payload = {
            sub: account.id,
            email: account.email,
            roles: roles.map(r => r.name),
            roleLevel,
        };

        // Token expires in 15 minutes (refresh token handles long-term sessions)
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

        return {
            accessToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
            user: {
                id: account.id,
                email: account.email,
                phone: account.phone,
                displayName: account.displayName,
                roles: roles.map(r => r.name),
                roleLevel,
                roleDisplayName: (roles.find(r => (r as any).level === roleLevel) as any)?.displayName || '登記志工',
            },
        };
    }


    // =========================================
    // 個人資料管理
    // =========================================

    /**
     * 更新個人資料
     */
    async updateProfile(accountId: string, data: { displayName?: string; avatarUrl?: string }): Promise<{
        id: string;
        displayName: string;
        avatarUrl: string;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        if (data.displayName !== undefined) {
            account.displayName = data.displayName;
        }

        if (data.avatarUrl !== undefined) {
            account.avatarUrl = data.avatarUrl;
        }

        await this.accountRepository.save(account);

        return {
            id: account.id,
            displayName: account.displayName,
            avatarUrl: account.avatarUrl,
        };
    }

    /**
     * 變更密碼
     */
    async changePassword(accountId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        // 驗證舊密碼
        const isValid = await bcrypt.compare(currentPassword, account.passwordHash);
        if (!isValid) {
            throw new UnauthorizedException('目前密碼不正確');
        }

        // 更新密碼
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.accountRepository.save(account);

        return { success: true };
    }

    /**
     * 設定密碼（針對 OAuth 帳號）
     * 只有沒有密碼的帳號可以使用此方法
     */
    async setPassword(accountId: string, newPassword: string): Promise<{ success: boolean }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        // 檢查是否已有密碼（非空字串表示已設定）
        if (account.passwordHash && account.passwordHash.length > 0) {
            throw new BadRequestException('此帳號已設定密碼，請使用「變更密碼」功能');
        }

        // 設定新密碼
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.accountRepository.save(account);

        return { success: true };
    }

    /**
     * 管理員設定密碼（用於緊急重設）
     * 可為任何帳號設定密碼
     */
    async adminSetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        const account = await this.accountRepository.findOne({ where: { email } });
        if (!account) {
            throw new NotFoundException(`帳號不存在: ${email}`);
        }

        // 設定新密碼
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.accountRepository.save(account);

        console.log(`Admin set password for account: ${email}`);
        return { success: true, message: `密碼已設定成功 for ${email}` };
    }

    /**
     * 重建系統擁有者帳號
     * 刪除現有帳號並建立新的
     */
    async recreateOwnerAccount(email: string, password: string): Promise<{ success: boolean; message: string; accountId?: string }> {
        // 1. 刪除現有帳號
        const existingAccount = await this.accountRepository.findOne({ where: { email } });
        if (existingAccount) {
            await this.accountRepository.delete({ id: existingAccount.id });
            console.log(`Deleted existing account: ${email}`);
        }

        // 2. 找到系統擁有者角色
        const ownerRole = await this.roleRepository.findOne({ where: { name: 'owner' } });
        if (!ownerRole) {
            throw new NotFoundException('系統擁有者角色不存在，請先執行 seed');
        }

        // 3. 建立新帳號
        const passwordHash = await bcrypt.hash(password, 10);
        const newAccount = this.accountRepository.create({
            email,
            passwordHash,
            displayName: '系統擁有者',
            isActive: true,
            emailVerified: true,
            roles: [ownerRole],
        });

        await this.accountRepository.save(newAccount);
        console.log(`Created new owner account: ${email} with id: ${newAccount.id}`);

        return {
            success: true,
            message: `系統擁有者帳號已重建: ${email}`,
            accountId: newAccount.id,
        };
    }

    /**
     * 檢查帳號是否已設定密碼
     */
    async hasPassword(accountId: string): Promise<{ hasPassword: boolean }> {
        const account = await this.accountRepository.findOne({
            where: { id: accountId },
            select: ['id', 'passwordHash'],
        });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        return {
            hasPassword: !!(account.passwordHash && account.passwordHash.length > 0)
        };
    }

    /**
     * 更新通知偏好設定
     */
    async updatePreferences(accountId: string, data: {
        alertNotifications?: boolean;
        taskNotifications?: boolean;
        trainingNotifications?: boolean;
    }): Promise<{
        alertNotifications: boolean;
        taskNotifications: boolean;
        trainingNotifications: boolean;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        if (data.alertNotifications !== undefined) {
            account.prefAlertNotifications = data.alertNotifications;
        }

        if (data.taskNotifications !== undefined) {
            account.prefTaskNotifications = data.taskNotifications;
        }

        if (data.trainingNotifications !== undefined) {
            account.prefTrainingNotifications = data.trainingNotifications;
        }

        await this.accountRepository.save(account);

        return {
            alertNotifications: account.prefAlertNotifications,
            taskNotifications: account.prefTaskNotifications,
            trainingNotifications: account.prefTrainingNotifications,
        };
    }

    /**
     * 獲取通知偏好設定
     */
    async getPreferences(accountId: string): Promise<{
        alertNotifications: boolean;
        taskNotifications: boolean;
        trainingNotifications: boolean;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });
        if (!account) {
            throw new UnauthorizedException('帳號不存在');
        }

        return {
            alertNotifications: account.prefAlertNotifications ?? true,
            taskNotifications: account.prefTaskNotifications ?? true,
            trainingNotifications: account.prefTrainingNotifications ?? true,
        };
    }

    // =========================================
    // OTP 相關方法
    // =========================================

    /**
     * 發送手機 OTP 驗證碼 (SMS - 備用)
     */
    async sendPhoneOtp(phone: string): Promise<{ success: boolean; message: string }> {
        if (!phone) {
            throw new BadRequestException('請提供手機號碼');
        }

        // 生成 OTP
        const code = await this.otpService.generateOtp(phone, 'phone');

        // 發送簡訊
        await this.smsService.sendOtp(phone, code);

        return {
            success: true,
            message: '驗證碼已發送，請查看您的手機簡訊',
        };
    }

    /**
     * 發送 LINE OTP 驗證碼
     */
    async sendLineOtp(lineUserId: string): Promise<{ success: boolean; message: string }> {
        if (!lineUserId) {
            throw new BadRequestException('請先綁定 LINE 帳號');
        }

        // 生成 OTP (使用 lineUserId 作為 target)
        const code = await this.otpService.generateOtp(lineUserId, 'phone');

        // 透過 LINE 發送驗證碼
        await this.lineBotService.sendOtp(lineUserId, code);

        return {
            success: true,
            message: '驗證碼已發送至您的 LINE',
        };
    }

    /**
     * 驗證 LINE OTP
     */
    async verifyLineOtp(lineUserId: string, code: string): Promise<{ success: boolean; verified: boolean }> {
        const verified = await this.otpService.verifyOtp(lineUserId, 'phone', code);
        return { success: true, verified };
    }

    /**
     * 驗證手機 OTP
     */
    async verifyPhoneOtp(phone: string, code: string): Promise<{ success: boolean; verified: boolean }> {
        const verified = await this.otpService.verifyOtp(phone, 'phone', code);

        if (verified) {
            // 更新帳號的手機驗證狀態
            const account = await this.accountRepository.findOne({ where: { phone } });
            if (account) {
                account.phoneVerified = true;
                await this.accountRepository.save(account);
            }
        }

        return { success: true, verified };
    }

    /**
     * 發送 Email 驗證碼 (6 位數 OTP)
     * 使用 OtpService 生成驗證碼，EmailService 發送郵件
     */
    async sendEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
        if (!email) {
            throw new BadRequestException('請提供 Email');
        }

        try {
            // 生成 6 位數 OTP 驗證碼
            const code = await this.otpService.generateOtp(email, 'email');

            // 使用 Resend 發送驗證碼郵件
            const sent = await this.emailService.sendOtp(email, code);

            if (sent) {
                return {
                    success: true,
                    message: '驗證碼已發送至您的 Email，請查收',
                };
            }

            return {
                success: false,
                message: '發送失敗，請稍後再試',
            };
        } catch (error) {
            // 如果是冷卻期錯誤，直接返回錯誤訊息
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('發送驗證碼失敗，請稍後再試');
        }
    }

    /**
     * 驗證 Email OTP（保留向後兼容）
     * 注意：Firebase 驗證連結會自動處理驗證狀態
     */
    async verifyEmailOtp(email: string, code: string): Promise<{ success: boolean; verified: boolean }> {
        // 先檢查 Firebase 是否已驗證
        if (this.firebaseAdminService.isConfigured()) {
            const isVerified = await this.firebaseAdminService.isEmailVerified(email);
            if (isVerified) {
                // 同步更新本地帳號的驗證狀態
                const account = await this.accountRepository.findOne({ where: { email } });
                if (account && !account.emailVerified) {
                    account.emailVerified = true;
                    await this.accountRepository.save(account);
                }
                return { success: true, verified: true };
            }
        }

        // Fallback: 使用 OTP 驗證
        const verified = await this.otpService.verifyOtp(email, 'email', code);

        if (verified) {
            // 更新帳號的 Email 驗證狀態
            const account = await this.accountRepository.findOne({ where: { email } });
            if (account) {
                account.emailVerified = true;
                await this.accountRepository.save(account);
            }

            // 同步更新 Firebase 的驗證狀態
            if (this.firebaseAdminService.isConfigured()) {
                await this.firebaseAdminService.setEmailVerified(email, true);
            }
        }

        return { success: true, verified };
    }

    /**
     * 發送自訂 Email 驗證信（使用 Resend）
     * 生成 Firebase 驗證連結，然後使用自訂模板發送
     */
    async sendCustomVerificationEmail(
        email: string,
        displayName?: string,
    ): Promise<{ success: boolean; message: string }> {
        if (!email) {
            throw new BadRequestException('請提供 Email');
        }

        // 確保 Firebase 中有此用戶
        if (this.firebaseAdminService.isConfigured()) {
            await this.firebaseAdminService.createFirebaseUser(email);
        }

        // 生成 Firebase 驗證連結
        const verificationLink = await this.firebaseAdminService.generateEmailVerificationLink(email, {
            url: 'https://lightkeepers.ngo/login?verified=true',
            handleCodeInApp: true,
        });

        if (!verificationLink) {
            return {
                success: false,
                message: 'Firebase 尚未設定，無法生成驗證連結',
            };
        }

        // 使用自訂模板發送郵件
        const result = await this.emailService.sendVerificationEmail(
            email,
            displayName || email.split('@')[0],
            verificationLink,
        );

        return result;
    }

    /**
     * 檢查 Email 驗證狀態
     * 優先從 Firebase 獲取，同步更新本地狀態
     */
    async checkEmailVerificationStatus(email: string): Promise<{ verified: boolean }> {
        // 先檢查 Firebase
        if (this.firebaseAdminService.isConfigured()) {
            const isVerified = await this.firebaseAdminService.isEmailVerified(email);
            if (isVerified) {
                // 同步更新本地帳號
                const account = await this.accountRepository.findOne({ where: { email } });
                if (account && !account.emailVerified) {
                    account.emailVerified = true;
                    await this.accountRepository.save(account);
                }
                return { verified: true };
            }
        }

        // Fallback: 檢查本地狀態
        const account = await this.accountRepository.findOne({ where: { email } });
        return { verified: account?.emailVerified ?? false };
    }

    // =========================================
    // 密碼重設相關方法
    // =========================================

    /**
     * 請求密碼重設（忘記密碼）
     */
    async requestPasswordReset(email?: string, phone?: string): Promise<{ success: boolean; message: string }> {
        if (!email && !phone) {
            throw new BadRequestException('請提供 Email 或手機號碼');
        }

        // 查找帳號
        const account = await this.passwordResetService.findAccountByEmailOrPhone(email, phone);

        if (!account) {
            // 為了安全，不透露帳號是否存在
            return {
                success: true,
                message: '如果帳號存在，您將會收到重設密碼的通知',
            };
        }

        // 優先使用 Firebase 發送密碼重設信
        if (email && account.email && this.firebaseAdminService.isConfigured()) {
            const result = await this.firebaseAdminService.sendPasswordReset(account.email);
            if (result.success) {
                return {
                    success: true,
                    message: '密碼重設連結已發送至您的 Email',
                };
            }
        }

        // Fallback: 使用傳統方式
        const token = await this.passwordResetService.createResetToken(account.id);
        const resetUrl = this.passwordResetService.generateResetUrl(token);

        // 發送重設通知（簡訊或 Email）
        if (phone && account.phone) {
            await this.smsService.sendPasswordResetSms(account.phone, resetUrl);
        }

        // 使用 Resend 發送 Email
        if (email && account.email) {
            await this.emailService.sendPasswordReset(account.email, resetUrl);
        }
        // TODO: 未來可加入 Email 發送

        return {
            success: true,
            message: '如果帳號存在，您將會收到重設密碼的通知',
        };
    }

    /**
     * 重設密碼
     */
    async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        if (!token || !newPassword) {
            throw new BadRequestException('缺少必要參數');
        }

        if (newPassword.length < 6) {
            throw new BadRequestException('密碼長度至少 6 個字元');
        }

        await this.passwordResetService.verifyAndResetPassword(token, newPassword);

        return {
            success: true,
            message: '密碼已成功重設，請使用新密碼登入',
        };
    }

    // =========================================
    // 帳號狀態相關方法
    // =========================================

    /**
     * 獲取帳號完整狀態
     */
    async getAccountStatus(accountId: string): Promise<{
        approvalStatus: string;
        phoneVerified: boolean;
        emailVerified: boolean;
        volunteerProfileCompleted: boolean;
        needsSetup: boolean;
    }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        const needsSetup = !account.volunteerProfileCompleted && account.approvalStatus === 'approved';

        return {
            approvalStatus: account.approvalStatus,
            phoneVerified: account.phoneVerified,
            emailVerified: account.emailVerified,
            volunteerProfileCompleted: account.volunteerProfileCompleted,
            needsSetup,
        };
    }

    /**
     * 標記志工資料已完成
     */
    async markVolunteerProfileCompleted(accountId: string): Promise<{ success: boolean }> {
        const account = await this.accountRepository.findOne({ where: { id: accountId } });

        if (!account) {
            throw new NotFoundException('帳號不存在');
        }

        account.volunteerProfileCompleted = true;
        await this.accountRepository.save(account);

        return { success: true };
    }
}
