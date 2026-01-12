/**
 * Audit Module
 * Provides audit logging capabilities across the application
 */

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditEventListener } from './audit-event.listener';

@Global() // Make available throughout the app
@Module({
    imports: [TypeOrmModule.forFeature([AuditLog])],
    controllers: [AuditController],
    providers: [AuditService, AuditEventListener],
    exports: [AuditService],
})
export class AuditModule { }

