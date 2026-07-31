import { Module, forwardRef } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        forwardRef(() => AuthModule), // Required for AuthService / JwtModule (原註解寫 JwtAuthGuard，該 guard 已於 1.6 收斂中移除)
    ],
    controllers: [RoutingController],
    providers: [RoutingService],
    exports: [RoutingService],
})
export class RoutingModule { }
