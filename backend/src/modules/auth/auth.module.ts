import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard, RolesGuard } from './guards';
import { Account, Role, PagePermission } from '../accounts/entities';
import { OtpCode, PasswordResetToken } from './entities';
import { SmsService, OtpService, PasswordResetService } from './services';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Account,
            Role,
            PagePermission,
            OtpCode,
            PasswordResetToken,
        ]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET', 'light-keepers-jwt-secret-2024'),
                signOptions: { expiresIn: '7d' },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtAuthGuard,
        RolesGuard,
        SmsService,
        OtpService,
        PasswordResetService,
    ],
    exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, OtpService, PasswordResetService],
})
export class AuthModule { }

