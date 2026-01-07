/**
 * Operations Core Module - 任務指揮中心
 * 
 * 整合模組: mission-sessions, tasks, task-dispatch, auto-dispatch,
 *           micro-task, smart-scheduling, scheduler, scheduled-tasks,
 *           triage, evacuation-sim, drill-simulation, damage-simulation,
 *           insarag, aar-analysis
 * 
 * 職責:
 * - ICS 指揮架構
 * - 任務生命週期管理
 * - 智慧派遣與排程
 * - 傷患分類 (START Triage)
 * - 演習模擬
 */

import { Module } from '@nestjs/common';
import { MissionSessionsModule } from '../../modules/mission-sessions/mission-sessions.module';
import { TasksModule } from '../../modules/tasks/tasks.module';

@Module({
    imports: [
        MissionSessionsModule,
        TasksModule,
        // 未來整合: TriageModule, SimulationModule, etc.
    ],
    exports: [MissionSessionsModule, TasksModule],
})
export class OperationsCoreModule { }
