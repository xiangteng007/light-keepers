/**
 * Mission Report Service
 * Phase 7: 報表匯出功能
 * 
 * 提供任務報告的 PDF、CSV、JSON 匯出
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionSession } from './entities/mission-session.entity';
import { Task } from './entities/task.entity';
import { MissionEvent } from './entities/event.entity';
import { SITREP } from './entities/sitrep.entity';
import { DecisionLog } from './entities/decision-log.entity';
import { AfterActionReview } from './entities/aar.entity';

// ==================== Types ====================

interface MissionReportData {
    session: MissionSession;
    tasks: Task[];
    events: MissionEvent[];
    sitreps: SITREP[];
    decisions: DecisionLog[];
    aar?: AfterActionReview;
    statistics: MissionStatistics;
}

interface MissionStatistics {
    duration: number; // minutes
    totalTasks: number;
    completedTasks: number;
    totalEvents: number;
    totalDecisions: number;
    completionRate: number;
}

export interface ReportResult {
    success: boolean;
    filename: string;
    contentType: string;
    base64?: string;
    json?: any;
    error?: string;
}

@Injectable()
export class MissionReportService {
    private readonly logger = new Logger(MissionReportService.name);

    constructor(
        @InjectRepository(MissionSession)
        private sessionRepo: Repository<MissionSession>,
        @InjectRepository(Task)
        private taskRepo: Repository<Task>,
        @InjectRepository(MissionEvent)
        private eventRepo: Repository<MissionEvent>,
        @InjectRepository(SITREP)
        private sitrepRepo: Repository<SITREP>,
        @InjectRepository(DecisionLog)
        private decisionRepo: Repository<DecisionLog>,
        @InjectRepository(AfterActionReview)
        private aarRepo: Repository<AfterActionReview>,
    ) { }

    // ==================== 資料收集 ====================

    /**
     * 收集任務報告所需的所有資料
     */
    async collectReportData(sessionId: string): Promise<MissionReportData | null> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) return null;

        const [tasks, events, sitreps, decisions, aar] = await Promise.all([
            this.taskRepo.find({ where: { sessionId } as any }),
            this.eventRepo.find({ where: { missionSessionId: sessionId } as any }),
            this.sitrepRepo.find({ where: { missionSessionId: sessionId } as any, order: { createdAt: 'ASC' } }),
            this.decisionRepo.find({ where: { missionSessionId: sessionId }, order: { createdAt: 'ASC' } }),
            this.aarRepo.findOne({ where: { missionSessionId: sessionId } }),
        ]);

        // 計算統計
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const duration = session.startedAt && session.endedAt
            ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
            : 0;

        const statistics: MissionStatistics = {
            duration,
            totalTasks: tasks.length,
            completedTasks,
            totalEvents: events.length,
            totalDecisions: decisions.length,
            completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        };

        return { session, tasks, events, sitreps, decisions, aar: aar || undefined, statistics };
    }

    // ==================== PDF 報告 ====================

    /**
     * 產生任務 PDF 報告
     */
    async generatePdfReport(sessionId: string): Promise<ReportResult> {
        const data = await this.collectReportData(sessionId);
        if (!data) {
            return { success: false, filename: '', contentType: '', error: 'Session not found' };
        }

        const html = this.buildPdfHtml(data);
        const base64 = Buffer.from(html).toString('base64');
        const filename = `mission-report-${sessionId.slice(0, 8)}-${Date.now()}.pdf`;

        this.logger.log(`Generated PDF report for session ${sessionId}`);

        return {
            success: true,
            filename,
            contentType: 'application/pdf',
            base64,
        };
    }

    private buildPdfHtml(data: MissionReportData): string {
        const { session, tasks, events, sitreps, decisions, aar, statistics } = data;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>任務報告 - ${session.title}</title>
    <style>
        body { font-family: 'Noto Sans TC', sans-serif; margin: 40px; color: #333; }
        h1 { color: #0a192f; border-bottom: 2px solid #d4a574; padding-bottom: 10px; }
        h2 { color: #112240; margin-top: 30px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-box { background: #f5f5f5; padding: 15px 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #d4a574; }
        .stat-label { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #0a192f; color: white; }
        .section { page-break-inside: avoid; margin-bottom: 30px; }
        .timeline { border-left: 3px solid #d4a574; padding-left: 20px; margin-left: 10px; }
        .timeline-item { margin-bottom: 15px; }
        .timeline-time { font-size: 12px; color: #888; }
        .footer { margin-top: 50px; text-align: center; color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <h1>🎯 任務報告</h1>
    <p><strong>${session.title}</strong></p>
    <p>狀態: ${session.status}</p>
    <p>開始時間: ${session.startedAt?.toLocaleString('zh-TW') || 'N/A'}</p>
    <p>結束時間: ${session.endedAt?.toLocaleString('zh-TW') || '進行中'}</p>

    <div class="section">
        <h2>📊 統計摘要</h2>
        <div class="stats">
            <div class="stat-box">
                <div class="stat-value">${statistics.duration}</div>
                <div class="stat-label">總時長 (分鐘)</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${statistics.completedTasks}/${statistics.totalTasks}</div>
                <div class="stat-label">任務完成</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${statistics.completionRate}%</div>
                <div class="stat-label">完成率</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${statistics.totalEvents}</div>
                <div class="stat-label">事件數</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${statistics.totalDecisions}</div>
                <div class="stat-label">決策記錄</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📋 任務列表</h2>
        <table>
            <thead>
                <tr><th>任務</th><th>狀態</th><th>優先級</th><th>負責人</th></tr>
            </thead>
            <tbody>
                ${tasks.map(t => `
                    <tr>
                        <td>${t.title}</td>
                        <td>${t.status}</td>
                        <td>${t.priority}</td>
                        <td>${t.assigneeName || t.assignedTeamName || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>📜 SITREP 時間軸</h2>
        <div class="timeline">
            ${sitreps.map(s => `
                <div class="timeline-item">
                    <div class="timeline-time">${(s as any).dtg || (s as any).createdAt?.toLocaleString('zh-TW')}</div>
                    <div><strong>${(s as any).situation || 'SITREP'}</strong></div>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>🎖️ 決策記錄</h2>
        <div class="timeline">
            ${decisions.map(d => `
                <div class="timeline-item">
                    <div class="timeline-time">${d.createdAt?.toLocaleString('zh-TW')}</div>
                    <div><strong>[${d.decisionType}]</strong> ${d.description}</div>
                    <div style="font-size: 12px; color: #666;">決策者: ${d.decidedBy}</div>
                </div>
            `).join('')}
        </div>
    </div>

    ${aar ? `
    <div class="section">
        <h2>📝 行動後檢討 (AAR)</h2>
        <p><strong>執行摘要:</strong> ${aar.executiveSummary || 'N/A'}</p>
        <p><strong>成功事項:</strong> ${(aar.successes || []).join(', ') || 'N/A'}</p>
        <p><strong>挑戰/問題:</strong> ${(aar.challenges || []).join(', ') || 'N/A'}</p>
        <p><strong>建議:</strong> ${(aar.recommendations || []).join(', ') || 'N/A'}</p>
    </div>
    ` : ''}

    <div class="footer">
        <p>光守護者災防平台 - 任務報告</p>
        <p>產生時間: ${new Date().toLocaleString('zh-TW')}</p>
    </div>
</body>
</html>`;
    }

    // ==================== CSV 報告 ====================

    /**
     * 匯出任務 CSV
     */
    async generateCsvReport(sessionId: string): Promise<ReportResult> {
        const data = await this.collectReportData(sessionId);
        if (!data) {
            return { success: false, filename: '', contentType: '', error: 'Session not found' };
        }

        const { tasks } = data;

        // CSV Header
        const headers = ['任務ID', '標題', '說明', '狀態', '優先級', '負責人', '小隊', '建立時間', '完成時間'];

        // CSV Rows
        const rows = tasks.map(t => [
            t.id,
            this.escapeCsv(t.title),
            this.escapeCsv(t.description || ''),
            t.status,
            t.priority,
            t.assigneeName || '',
            t.assignedTeamName || '',
            t.createdAt?.toISOString() || '',
            t.completedAt?.toISOString() || '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(',')),
        ].join('\n');

        const base64 = Buffer.from('\ufeff' + csvContent).toString('base64'); // UTF-8 BOM
        const filename = `mission-tasks-${sessionId.slice(0, 8)}-${Date.now()}.csv`;

        this.logger.log(`Generated CSV report for session ${sessionId}`);

        return {
            success: true,
            filename,
            contentType: 'text/csv; charset=utf-8',
            base64,
        };
    }

    private escapeCsv(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    // ==================== JSON 完整資料包 ====================

    /**
     * 匯出完整 JSON 資料包
     */
    async generateJsonPackage(sessionId: string): Promise<ReportResult> {
        const data = await this.collectReportData(sessionId);
        if (!data) {
            return { success: false, filename: '', contentType: '', error: 'Session not found' };
        }

        const jsonData = {
            exportVersion: '1.0',
            exportedAt: new Date().toISOString(),
            session: {
                ...data.session,
                statistics: data.statistics,
            },
            tasks: data.tasks,
            events: data.events,
            sitreps: data.sitreps,
            decisions: data.decisions,
            aar: data.aar,
        };

        const base64 = Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64');
        const filename = `mission-data-${sessionId.slice(0, 8)}-${Date.now()}.json`;

        this.logger.log(`Generated JSON package for session ${sessionId}`);

        return {
            success: true,
            filename,
            contentType: 'application/json',
            base64,
            json: jsonData,
        };
    }
}
