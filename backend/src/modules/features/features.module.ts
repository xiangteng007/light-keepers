/**
 * Features Module
 * Feature flags and A/B testing
 */

import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';

@Global()
@Module({
    providers: [FeatureFlagsService],
    controllers: [FeatureFlagsController],
    exports: [FeatureFlagsService],
})
export class FeaturesModule { }
