import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Account, Role, PagePermission } from './entities';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { SeedService } from './seed.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Account, Role, PagePermission]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET', 'light-keepers-jwt-secret-2024'),
                signOptions: { expiresIn: '7d' },
            }),
        }),
    ],
    controllers: [AccountsController],
    providers: [AccountsService, SeedService],
    exports: [AccountsService, TypeOrmModule],
})
export class AccountsModule { }


