/**
 * System Module
 * System administration features
 */

import { Module, Global } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { SystemBackupService } from './system-backup.service';
import { SystemController } from './system.controller';

@Global()
@Module({
    providers: [SystemSettingsService, SystemBackupService],
    controllers: [SystemController],
    exports: [SystemSettingsService, SystemBackupService],
})
export class SystemModule { }
