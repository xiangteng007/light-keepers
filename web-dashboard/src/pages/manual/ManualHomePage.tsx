import React, { useState } from 'react';
import { ManualButton } from '../../components/manual/ManualButton';
import { ManualCard } from '../../components/manual/ManualCard';
import { ManualTag } from '../../components/manual/ManualTag';
import { RiskBadge } from '../../components/manual/RiskBadge';
import { ManualSearchInput } from '../../components/manual/ManualSearchInput';
import { createLogger } from '../../utils/logger';
import './ManualHomePage.css';

const logger = createLogger('Manual');

// 值勤快捷操作
const QUICK_ACTIONS = [
    { id: 'check-in', icon: '📍', label: '集合報到' },
    { id: 'assign', icon: '👥', label: '分工指派' },
    { id: 'comm', icon: '📻', label: '通聯設定' },
    { id: 'risk', icon: '⚠️', label: '風險評估' },
    { id: 'safety', icon: '🛡️', label: '現場安全' },
    { id: 'evac', icon: '🚪', label: '撤離程序' },
    { id: 'handover', icon: '🔄', label: '交接流程' },
    { id: 'report', icon: '📝', label: '回報範本' },
];

// 任務流程
const TASK_FLOWS = [
    {
        id: 'pre-deploy',
        icon: '🎒',
        title: '出勤前準備',
        description: '裝備檢查、風險評估、任務簡報',
        tags: ['裝備', '檢查'],
        riskLevel: 'low' as const,
    },
    {
        id: 'arrival',
        icon: '🚗',
        title: '到場初期',
        description: '現場評估、設置管制、回報狀況',
        tags: ['評估', '管制'],
        riskLevel: 'medium' as const,
    },
    {
        id: 'execution',
        icon: '🔧',
        title: '現場執行',
        description: '執行救援、管理現場、持續通報',
        tags: ['救援', '執行'],
        riskLevel: 'high' as const,
    },
    {
        id: 'evacuation',
        icon: '🏃',
        title: '撤離與交接',
        description: '安全撤離、交接任務、裝備歸還',
        tags: ['撤離', '交接'],
        riskLevel: 'medium' as const,
    },
    {
        id: 'debrief',
        icon: '📋',
        title: '任務復原',
        description: '任務檢討、經驗分享、裝備維護',
        tags: ['檢討', '維護'],
        riskLevel: 'low' as const,
    },
];

// 新手必讀
const BEGINNER_GUIDES = [
    {
        id: 'equipment',
        icon: '🎒',
        title: '志工出勤基本裝備清單',
        description: '完整的個人裝備準備指南',
        riskLevel: 'low' as const,
    },
    {
        id: 'communication',
        icon: '📻',
        title: '無線電通聯標準流程',
        description: '基本通訊協定與緊急呼叫',
        riskLevel: 'low' as const,
    },
    {
        id: 'safety',
        icon: '🛡️',
        title: '現場安全三要素',
        description: '自我保護與團隊安全原則',
        riskLevel: 'low' as const,
    },
];

// 場域入口
const FIELD_ENTRIES = [
    { id: 'urban', icon: '🏙️', label: '都會環境', count: 15 },
    { id: 'mountain', icon: '⛰️', label: '山域/戶外', count: 12 },
    { id: 'water', icon: '🌊', label: '水域', count: 8 },
    { id: 'shelter', icon: '🏠', label: '避難所', count: 10 },
    { id: 'traffic', icon: '🚗', label: '交通', count: 6 },
    { id: 'community', icon: '🏘️', label: '社區/居家', count: 14 },
];

export const ManualHomePage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="manual-home">
            {/* Header */}
            <header className="manual-header">
                <button
                    className="manual-header__menu-btn"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="選單"
                >
                    ☰
                </button>
                <h1 className="manual-header__logo">應急響應指揮系統手冊</h1>
                <div className="manual-header__search">
                    <ManualSearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="搜尋..."
                    />
                </div>
                <button className="manual-header__user" aria-label="用戶">
                    👤
                </button>
            </header>

            {/* 主要內容區 */}
            <main className="manual-main">

                {/* 1. 值勤快捷 */}
                <section className="manual-section manual-quick-access">
                    <h2 className="manual-section__title">值勤快捷</h2>
                    <div className="quick-buttons">
                        {QUICK_ACTIONS.map((action) => (
                            <ManualButton key={action.id} className="quick-button">
                                <span className="quick-button__icon">{action.icon}</span>
                                <span className="quick-button__label">{action.label}</span>
                            </ManualButton>
                        ))}
                    </div>
                </section>

                {/* 2. 任務流程 */}
                <section className="manual-section manual-task-flows">
                    <h2 className="manual-section__title">任務流程</h2>
                    <div className="task-cards-scroll">
                        {TASK_FLOWS.map((flow) => (
                            <ManualCard
                                key={flow.id}
                                variant="task-flow"
                                title={flow.title}
                                description={flow.description}
                                icon={flow.icon}
                                tags={flow.tags}
                                riskLevel={flow.riskLevel}
                                onClick={() => logger.debug('Navigate to', flow.id)}
                            />
                        ))}
                    </div>
                </section>

                {/* 3. 新手必讀 */}
                <section className="manual-section manual-beginner-guide">
                    <h2 className="manual-section__title">新手必讀</h2>
                    <div className="beginner-list">
                        {BEGINNER_GUIDES.map((guide) => (
                            <ManualCard
                                key={guide.id}
                                variant="manual-list"
                                title={guide.title}
                                description={guide.description}
                                icon={guide.icon}
                                riskLevel={guide.riskLevel}
                                onClick={() => logger.debug('Navigate to', guide.id)}
                            />
                        ))}
                    </div>
                </section>

                {/* 4. 場域入口 */}
                <section className="manual-section manual-field-entries">
                    <h2 className="manual-section__title">場域入口</h2>
                    <div className="field-grid">
                        {FIELD_ENTRIES.map((field) => (
                            <ManualCard
                                key={field.id}
                                variant="field-entry"
                                title={field.label}
                                icon={field.icon}
                                articleCount={field.count}
                                onClick={() => logger.debug('Navigate to field', field.id)}
                            />
                        ))}
                    </div>
                </section>

                {/* 5. 技能專區 */}
                <section className="manual-section manual-skills-zone">
                    <h2 className="manual-section__title">技能專區</h2>
                    <div className="skills-scroll">
                        <ManualTag selected>急救與醫護</ManualTag>
                        <ManualTag>通訊作業</ManualTag>
                        <ManualTag>避難管理</ManualTag>
                        <ManualTag>搜救技術</ManualTag>
                        <ManualTag>現場安全</ManualTag>
                    </div>
                </section>

                {/* 6. 最近更新 */}
                <section className="manual-section manual-recent-updates">
                    <h2 className="manual-section__title">最近更新</h2>
                    <div className="recent-list">
                        <div className="recent-item">
                            <span className="recent-item__date">2026-01-03</span>
                            <span className="recent-item__title">風災避難引導標準程序</span>
                            <RiskBadge level="medium" showIcon={false} />
                        </div>
                        <div className="recent-item">
                            <span className="recent-item__date">2026-01-02</span>
                            <span className="recent-item__title">CPR 與 AED 操作指南</span>
                            <RiskBadge level="high" showIcon={false} />
                        </div>
                        <div className="recent-item">
                            <span className="recent-item__date">2026-01-01</span>
                            <span className="recent-item__title">地震後建築安全檢查</span>
                            <RiskBadge level="medium" showIcon={false} />
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};
