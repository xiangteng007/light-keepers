/**
 * Public Decorator
 * 
 * Marks an endpoint as intentionally public (no authentication required).
 * All public endpoints MUST use this decorator - "no guard" is NOT acceptable.
 * 
 * Policy: All @Public endpoints must also have @Throttle for rate limiting.
 * 
 * @see docs/proof/security/public-surface.md for the auditable list
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as explicitly public (no authentication required).
 * 
 * @example
 * @Public()
 * @Throttle({ default: { limit: 60, ttl: 60000 } })
 * @Get('public-stats')
 * getPublicStats() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
