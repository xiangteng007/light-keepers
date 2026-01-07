import { Module, forwardRef } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        forwardRef(() => AuthModule), // Required for JwtAuthGuard
    ],
    controllers: [RoutingController],
    providers: [RoutingService],
    exports: [RoutingService],
})
export class RoutingModule { }
