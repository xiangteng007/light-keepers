import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, Role } from './entities';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Account, Role])],
    controllers: [AccountsController],
    providers: [AccountsService],
    exports: [AccountsService],
})
export class AccountsModule { }
