/**
 * IAM Core Module - 身分與存取管理
 * 
 * 整合模組: auth, two-factor-auth, biometric-auth, ip-whitelist,
 *           session-timeout, gdpr-compliance, data-encryption, secret-rotation
 * 
 * 職責:
 * - 身分驗證 (JWT, OAuth, LINE SSO)
 * - 多因素認證 (MFA)
 * - 安全策略管理
 * - GDPR 合規
 */

import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';

@Module({
    imports: [
        AuthModule, // 現有認證模組
        // 未來整合: TwoFactorModule, BiometricModule, etc.
    ],
    exports: [AuthModule],
})
export class IamCoreModule { }
