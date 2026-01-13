/**
 * RequireLevel Decorator
 * 
 * Role level-based access control decorator
 * Requires user to have at least the specified role level
 */

import { SetMetadata } from '@nestjs/common';

export const REQUIRE_LEVEL_KEY = 'requireLevel';

/**
 * Requires user to have at least the specified role level
 * 
 * Level definitions:
 * - 1: 一般使用者 (Basic user)
 * - 2: 志工 (Volunteer)
 * - 3: 組長 (Team Leader)
 * - 4: 管理員 (Admin)
 * - 5: 最高管理員 (Super Admin)
 * 
 * @param level Minimum required role level
 */
export const RequireLevel = (level: number) => SetMetadata(REQUIRE_LEVEL_KEY, level);
