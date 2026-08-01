/**
 * AITasksPage.tsx
 *
 * AI 任務頁面 - AI 自動化任務管理
 *
 * 現況：AI 自動化功能尚在開發中，本頁為狀態總覽 + 預告卡片（無即時資料串接）。
 * archetype：List 的輕量變體（統計摘要列 + 卡片清單），Board 骨架不適用——
 * 內容並非可拖拉狀態的任務清單，而是功能路線圖預告。
 */
import type { ReactNode } from 'react';
import { Bot, Zap, Brain, Sparkles, Clock, ListChecks } from 'lucide-react';
import { Card, Badge, Alert, StatIndicator } from '../design-system';
import './AITasksPage.css';

const STATUS_STATS: Array<{
    icon: ReactNode;
    value: number;
    label: string;
    variant: 'success' | 'warning' | 'default';
}> = [
    { icon: <ListChecks size={20} aria-hidden="true" />, value: 8, label: '已完成任務', variant: 'success' },
    { icon: <Clock size={20} aria-hidden="true" />, value: 3, label: '執行中', variant: 'warning' },
    { icon: <Sparkles size={20} aria-hidden="true" />, value: 12, label: '排程中', variant: 'default' },
];

const UPCOMING_FEATURES = [
    { icon: Zap, title: '智能排班', desc: '自動最佳化人員調度' },
    { icon: Brain, title: '情報摘要', desc: '自動生成 SITREP 報告' },
    { icon: Bot, title: '資源匹配', desc: '需求與供給智能配對' },
];

export default function AITasksPage() {
    return (
        <div className="ai-tasks-page">
            <div className="page-header">
                <div className="page-header__titles">
                    <h1>AI 任務</h1>
                    <p className="page-header__subtitle">AI 自動化任務排程與執行監控</p>
                </div>
            </div>

            <Alert variant="info" title="AI 功能開發中" icon={<Bot size={20} aria-hidden="true" />}>
                AI 自動化系統正在開發中，預計包含：智能排班、資源匹配、情報摘要、預測分析等功能。
            </Alert>

            {/* 統計摘要列 */}
            <div className="ai-tasks-stats">
                {STATUS_STATS.map((stat) => (
                    <Card key={stat.label} padding="md" className="ai-tasks-stat-card">
                        <StatIndicator icon={stat.icon} value={stat.value} label={stat.label} variant={stat.variant} />
                    </Card>
                ))}
            </div>

            {/* 預期功能區塊 */}
            <section className="ai-tasks-panel" aria-label="預期 AI 功能">
                <header className="ai-tasks-panel__header">
                    <h2>預期 AI 功能</h2>
                    <Badge variant="default" size="sm">路線圖</Badge>
                </header>
                <div className="ai-tasks-feature-grid">
                    {UPCOMING_FEATURES.map((feature) => (
                        <Card key={feature.title} padding="md" className="ai-tasks-feature-card">
                            <feature.icon size={24} aria-hidden="true" />
                            <div className="ai-tasks-feature-card__title">{feature.title}</div>
                            <div className="ai-tasks-feature-card__desc">{feature.desc}</div>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
