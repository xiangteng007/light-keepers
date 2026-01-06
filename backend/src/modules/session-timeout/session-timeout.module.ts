import { Module } from '@nestjs/common';
import { SessionTimeoutService } from './session-timeout.service';

@Module({
    providers: [SessionTimeoutService],
    exports: [SessionTimeoutService],
})
export class SessionTimeoutModule { }
