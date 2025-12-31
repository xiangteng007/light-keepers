import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Simple JWT Authentication Guard
 * 
 * This guard only validates the JWT token without querying the database.
 * It's designed for use in modules that cannot import the full AuthModule
 * due to circular dependency issues.
 * 
 * Use this in VMS controllers where we just need to verify the user is authenticated,
 * without needing full user details from AccountRepository.
 */
@Injectable()
export class SimpleJwtGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            return false;
        }

        try {
            const payload = this.jwtService.verify(token);

            // Attach minimal user info to request
            // Note: This doesn't include full user details like roles
            (request as any).user = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
            };

            return true;
        } catch (error) {
            return false;
        }
    }

    private extractTokenFromHeader(request: Request): string | null {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : null;
    }
}
