import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SimpleJwtGuard } from './simple-jwt.guard';

/**
 * Shared JWT Module
 * 
 * This module provides SimpleJwtGuard without full AuthModule dependencies.
 * Use this module in feature modules that need JWT authentication but don't
 * want to create circular dependencies with AuthModule.
 * 
 * Note: SimpleJwtGuard only validates the JWT token, it doesn't query 
 * AccountRepository for full user details.
 * 
 * Usage: Import SharedJwtModule in your feature module, then use @UseGuards(SimpleJwtGuard)
 */
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
    providers: [SimpleJwtGuard],
    exports: [SimpleJwtGuard, JwtModule],
})
export class SharedJwtModule { }
