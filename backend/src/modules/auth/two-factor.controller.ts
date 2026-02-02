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
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { TwoFactorService } from './services/two-factor.service';

class VerifyTokenDto {
    secret: string;
    token: string;
}

class VerifyLoginDto {
    token: string;
}

class DisableDto {
    password: string;
}

@ApiTags('Two-Factor Authentication')
@Controller('auth/2fa')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
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
    @ApiBody({ schema: { type: 'object', properties: { code: { type: 'string' } } } })
    async verifyBackupCode(@Req() req: Request, @Body() body: { code: string }) {
        const userId = (req as any).user?.id;
        const isValid = await this.twoFactorService.verifyBackupCode(userId, body.code);
        return {
            success: isValid,
            message: isValid ? '備用碼驗證成功' : '備用碼錯誤',
        };
    }
}
