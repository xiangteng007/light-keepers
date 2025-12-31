import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CoreJwtGuard } from './guards/core-jwt.guard';
import { UnifiedRolesGuard } from './guards/unified-roles.guard';

// Re-export all guards, decorators, and types
export * from './guards';

/**
 * SharedAuthModule - 統一認證模組
 * 
 * 解決的問題：
 * 1. JwtModule 重複註冊在多個模組 (AuthModule, AccountsModule)
 * 2. 多種不同的 Guard 實作 (JwtAuthGuard, SimpleJwtGuard, RolesGuard, AdminGuard)
 * 3. 循環依賴問題 (AuthModule ↔ VolunteersModule)
 * 
 * 提供的功能：
 * - CoreJwtGuard: 只驗證 JWT，不查資料庫，避免循環依賴
 * - UnifiedRolesGuard: 統一的角色/等級權限檢查
 * - RequiredLevel: 標記需要的最低權限等級
 * - RequiredRoles: 標記需要的角色名稱
 * - CurrentUser: 取得當前用戶資訊的裝飾器
 * 
 * 使用方式：
 * 
 * 1. 在 feature module 中匯入 SharedAuthModule
 *    @Module({
 *      imports: [SharedAuthModule],
 *    })
 * 
 * 2. 在 controller 中使用 guards
 *    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
 *    @RequiredLevel(ROLE_LEVELS.OFFICER)
 *    @Get('admin-only')
 *    adminOnly(@CurrentUser() user: JwtPayload) {
 *      return user;
 *    }
 * 
 * 3. 只需要認證（不需要權限檢查）
 *    @UseGuards(CoreJwtGuard)
 *    @Get('authenticated')
 *    authenticated() { }
 */
@Global()
@Module({
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET', 'light-keepers-jwt-secret-2024'),
                signOptions: { expiresIn: '7d' },
            }),
        }),
    ],
    providers: [CoreJwtGuard, UnifiedRolesGuard],
    exports: [JwtModule, CoreJwtGuard, UnifiedRolesGuard],
})
export class SharedAuthModule { }

