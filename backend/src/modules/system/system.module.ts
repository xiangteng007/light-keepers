/**
 * System Module
 * System administration features
 */

import { Module, Global } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { SystemBackupService } from './system-backup.service';
import { DataPrivacyService } from './data-privacy.service';
import { SystemController } from './system.controller';
import { DataPrivacyController } from './data-privacy.controller';

@Global()
@Module({
    providers: [SystemSettingsService, SystemBackupService, DataPrivacyService],
    controllers: [SystemController, DataPrivacyController],
    exports: [SystemSettingsService, SystemBackupService, DataPrivacyService],
})
export class SystemModule { }
