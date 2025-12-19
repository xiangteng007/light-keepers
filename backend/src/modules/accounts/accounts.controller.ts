import { Controller, Get, Param } from '@nestjs/common';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Get()
    findAll() {
        return this.accountsService.findAll();
    }

    @Get('roles')
    getRoles() {
        return this.accountsService.getAllRoles();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.accountsService.findById(id);
    }
}
