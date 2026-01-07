/**
 * Workforce Core Module - 人力資源管理
 * 
 * 整合模組: volunteers, volunteer-certification, volunteer-points,
 *           attendance, shift-calendar, rewards, payroll, accounts
 * 
 * 職責:
 * - 志工 CRUD 與搜尋
 * - 排班與出勤管理
 * - 積分與獎勵系統
 * - 證照管理
 * - 薪資/津貼發放
 */

import { Module } from '@nestjs/common';
import { VolunteersModule } from '../../modules/volunteers/volunteers.module';
import { AccountsModule } from '../../modules/accounts/accounts.module';

@Module({
    imports: [
        VolunteersModule,
        AccountsModule,
        // 未來整合: AttendanceModule, ShiftCalendarModule, etc.
    ],
    exports: [VolunteersModule, AccountsModule],
})
export class WorkforceCoreModule { }
