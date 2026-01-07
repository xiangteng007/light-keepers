import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard, RolesGuard } from './guards';
import { Account, Role, PagePermission } from '../accounts/entities';
import { OtpCode, PasswordResetToken } from './entities';
import { RefreshToken } from './entities/refresh-token.entity';
import { SmsService, OtpService, PasswordResetService, EmailService, FirebaseAdminService } from './services';
import { RefreshTokenService } from './services/refresh-token.service';
import { LineBotModule } from '../line-bot/line-bot.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Account,
            Role,
            PagePermission,
            OtpCode,
            PasswordResetToken,
            RefreshToken,
        ]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET', 'light-keepers-jwt-secret-2024'),
                signOptions: { expiresIn: '15m' }, // Shortened to 15 minutes with refresh token
            }),
        }),
        LineBotModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtAuthGuard,
        RolesGuard,
        SmsService,
        OtpService,
        PasswordResetService,
        EmailService,
        FirebaseAdminService,
        RefreshTokenService,
    ],
    exports: [TypeOrmModule, AuthService, JwtAuthGuard, RolesGuard, JwtModule, OtpService, PasswordResetService, FirebaseAdminService, RefreshTokenService],
})
export class AuthModule { }


