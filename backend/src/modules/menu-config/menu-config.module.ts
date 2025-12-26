import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MenuConfig } from './menu-config.entity';
import { MenuConfigService } from './menu-config.service';
import { MenuConfigController } from './menu-config.controller';
import { Account } from '../accounts/entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([MenuConfig, Account]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET', 'light-keepers-jwt-secret-2024'),
                signOptions: { expiresIn: '7d' },
            }),
        }),
    ],
    controllers: [MenuConfigController],
    providers: [MenuConfigService],
    exports: [MenuConfigService],
})
export class MenuConfigModule { }

