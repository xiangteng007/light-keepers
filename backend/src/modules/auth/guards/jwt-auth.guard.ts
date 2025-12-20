import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            return false;
        }

        try {
            const payload = this.jwtService.verify(token);
            const user = await this.accountRepository.findOne({
                where: { id: payload.sub },
                relations: ['roles'],
            });

            if (!user) {
                return false;
            }

            request.user = user;
            return true;
        } catch {
            return false;
        }
    }

    private extractTokenFromHeader(request: any): string | null {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : null;
    }
}
