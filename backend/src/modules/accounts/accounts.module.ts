import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, Role, PagePermission } from './entities';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { SeedService } from './seed.service';

@Module({
    imports: [TypeOrmModule.forFeature([Account, Role, PagePermission])],
    controllers: [AccountsController],
    providers: [AccountsService, SeedService],
    exports: [AccountsService, TypeOrmModule],
})
export class AccountsModule { }


