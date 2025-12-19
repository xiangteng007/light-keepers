import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, Role } from './entities';

@Injectable()
export class AccountsService {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
    ) { }

    async findAll(): Promise<Account[]> {
        return this.accountRepository.find({ relations: ['roles'] });
    }

    async findById(id: string): Promise<Account | null> {
        return this.accountRepository.findOne({
            where: { id },
            relations: ['roles'],
        });
    }

    async findByEmail(email: string): Promise<Account | null> {
        return this.accountRepository.findOne({
            where: { email },
            relations: ['roles'],
        });
    }

    async getAllRoles(): Promise<Role[]> {
        return this.roleRepository.find();
    }
}
