/**
 * WebSocket Authentication Guard
 * 
 * Validates JWT tokens for Socket.IO connections.
 * Prevents unauthorized WebSocket connections.
 * 
 * Usage in Gateway:
 * @WebSocketGateway()
 * @UseGuards(WsAuthGuard)
 * export class RealtimeGateway { ... }
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient();
            const token = this.extractToken(client);

            if (!token) {
                throw new WsException('未提供認證 Token');
            }

            const payload = await this.jwtService.verifyAsync(token);
            
            // Attach user to socket for later use
            client.data.user = payload;

            return true;
        } catch (error) {
            console.error('[WsAuthGuard] Authentication failed:', error.message);
            throw new WsException('WebSocket 認證失敗');
        }
    }

    private extractToken(client: Socket): string | undefined {
        // Try auth object first (Socket.IO 4.x)
        if (client.handshake.auth?.token) {
            return client.handshake.auth.token;
        }

        // Fallback to query parameter
        if (client.handshake.query?.token) {
            return client.handshake.query.token as string;
        }

        // Fallback to Authorization header
        const authHeader = client.handshake.headers?.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        return undefined;
    }
}

/**
 * Decorator to get authenticated user from WebSocket context
 */
export function WsUser() {
    return (target: unknown, propertyKey: string, parameterIndex: number) => {
        // Implementation would be added here
    };
}

/**
 * Helper to get user from socket in handlers
 */
export function getWsUser(client: Socket): unknown {
    return client.data?.user;
}
