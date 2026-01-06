/**
 * Error Tracking Module
 * Provides Sentry integration for error monitoring
 */

import { Module, Global } from '@nestjs/common';
import { ErrorTrackingService } from './error-tracking.service';

@Global()
@Module({
    providers: [ErrorTrackingService],
    exports: [ErrorTrackingService],
})
export class ErrorTrackingModule { }
