/**
 * Two-Factor Authentication Controller
 * 
 * Endpoints for 2FA setup, verification, and management
 * v1.0
 */

import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { TwoFactorService } from './services/two-factor.service';

/**
 * P0 輸入驗證修正：以下 DTO 原本是「沒有任何 class-validator 裝飾器的空類別」。
 *
 * 全域 ValidationPipe 設定為 `whitelist: true` + `forbidNonWhitelisted: true`，
 * 而 class-validator 的 whitelist 是以「有無驗證裝飾器」判斷欄位是否合法：
 * 沒有裝飾器的類別 → 送進來的每個欄位都被視為非白名單欄位 → 一律回 400。
 * 也就是說 `/auth/2fa/verify`、`/validate`、`DELETE /auth/2fa` 三個端點
 * **在正式環境是壞的**（任何請求都被驗證層擋掉）。補上裝飾器同時修好驗證與可用性。
 */

/** TOTP 為 6 位數字（speakeasy 預設） */
const TOTP_PATTERN = /^\d{6}$/;
const TOTP_MESSAGE = '驗證碼必須是 6 位數字';

/** 備用碼格式：`XXXX-XXXX`（`generateBackupCodes()` 產生的大寫十六進位） */
const BACKUP_CODE_PATTERN = /^[0-9A-Fa-f]{4}-?[0-9A-Fa-f]{4}$/;
const BACKUP_CODE_MESSAGE = '備用碼格式不正確';

export class VerifyTokenDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    secret: string;

    @IsString()
    @Matches(TOTP_PATTERN, { message: TOTP_MESSAGE })
    token: string;
}

export class VerifyLoginDto {
    @IsString()
    @Matches(TOTP_PATTERN, { message: TOTP_MESSAGE })
    token: string;
}

export class DisableDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    password: string;
}

export class VerifyBackupCodeDto {
    @IsString()
    @Matches(BACKUP_CODE_PATTERN, { message: BACKUP_CODE_MESSAGE })
    code: string;
}

@ApiTags('Two-Factor Authentication')
@Controller('auth/2fa')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
// P0 授權定級：全部端點都只操作「呼叫者自己」的 2FA 設定（service 以 req.user.id 取值），
// 不會跨帳號讀寫，故最低等級即可；定為 L1 以排除未升級的 L0 帳號。
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
@ApiBearerAuth()
export class TwoFactorController {
    constructor(private readonly twoFactorService: TwoFactorService) { }

    @Get('status')
    @ApiOperation({ summary: 'Get 2FA status for current user' })
    async getStatus(@Req() req: Request) {
        const userId = (req as any).user?.id;
        const status = await this.twoFactorService.getStatus(userId);
        return {
            success: true,
            data: status,
        };
    }

    @Post('setup')
    @ApiOperation({ summary: 'Initialize 2FA setup (generate secret and QR code)' })
    async setup(@Req() req: Request) {
        const userId = (req as any).user?.id;
        const setupData = await this.twoFactorService.generateSetup(userId);
        return {
            success: true,
            message: '請使用驗證器 App 掃描 QR Code',
            data: {
                secret: setupData.secret,
                qrCodeUrl: setupData.qrCodeUrl,
                backupCodes: setupData.backupCodes,
            },
        };
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify TOTP code and enable 2FA' })
    @ApiBody({ type: VerifyTokenDto })
    async verify(@Req() req: Request, @Body() body: VerifyTokenDto) {
        const userId = (req as any).user?.id;
        await this.twoFactorService.verifyAndEnable(userId, body.secret, body.token);
        return {
            success: true,
            message: '兩步驟驗證已成功啟用',
        };
    }

    @Post('validate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Validate TOTP code during login' })
    @ApiBody({ type: VerifyLoginDto })
    async validate(@Req() req: Request, @Body() body: VerifyLoginDto) {
        const userId = (req as any).user?.id;
        const isValid = await this.twoFactorService.verifyLogin(userId, body.token);
        return {
            success: isValid,
            message: isValid ? '驗證成功' : '驗證碼錯誤',
        };
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disable 2FA (requires password)' })
    @ApiBody({ type: DisableDto })
    async disable(@Req() req: Request, @Body() body: DisableDto) {
        const userId = (req as any).user?.id;
        await this.twoFactorService.disable(userId, body.password);
        return {
            success: true,
            message: '兩步驟驗證已停用',
        };
    }

    @Post('backup-codes')
    @ApiOperation({ summary: 'Regenerate backup codes' })
    async regenerateBackupCodes(@Req() req: Request) {
        const userId = (req as any).user?.id;
        const codes = await this.twoFactorService.regenerateBackupCodes(userId);
        return {
            success: true,
            message: '備用碼已重新產生，請妥善保存',
            data: {
                backupCodes: codes,
            },
        };
    }

    @Post('verify-backup')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify using a backup code' })
    @ApiBody({ type: VerifyBackupCodeDto })
    async verifyBackupCode(@Req() req: Request, @Body() body: VerifyBackupCodeDto) {
        const userId = (req as any).user?.id;
        const isValid = await this.twoFactorService.verifyBackupCode(userId, body.code);
        return {
            success: isValid,
            message: isValid ? '備用碼驗證成功' : '備用碼錯誤',
        };
    }
}
