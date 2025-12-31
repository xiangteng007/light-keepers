import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, Role, PagePermission } from './entities';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { SeedService } from './seed.service';
import { AuthModule } from '../auth/auth.module';

/**
 * AccountsModule
 * 
 * 注意：JwtModule 現在由 SharedAuthModule 全域提供，不需要在這裡重複註冊
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Account, Role, PagePermission]),
        // JwtModule is now provided globally by SharedAuthModule
        forwardRef(() => AuthModule),
    ],
    controllers: [AccountsController],
    providers: [AccountsService, SeedService],
    exports: [AccountsService, TypeOrmModule],
})
export class AccountsModule { }
