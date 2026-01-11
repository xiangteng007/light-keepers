/**
 * AARPage.tsx
 * 
 * C2 Domain - AAR (After Action Review) 檢討頁面
 * 任務後檢討與經驗學習
 */
import React, { useState } from 'react';
import { FileCheck, Calendar, Users, ThumbsUp, ThumbsDown, Lightbulb, ChevronRight } from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import './AARPage.css';

interface AARReport {
    id: string;
    title: string;
    incidentNumber: string;
    date: string;
    facilitator: string;
    participants: number;
    lessonsLearned: number;
    actionItems: number;
}

const MOCK_AARS: AARReport[] = [
    { id: '1', title: '2026/01 大安區地震應變', incidentNumber: 'INC-2026-00123', date: '2026/01/11', facilitator: '陳指揮官', participants: 12, lessonsLearned: 5, actionItems: 8 },
    { id: '2', title: '2025/12 颱風疏散演練', incidentNumber: 'DRL-2025-00045', date: '2025/12/20', facilitator: '林隊長', participants: 25, lessonsLearned: 7, actionItems: 12 },
    { id: '3', title: '2025/12 火災救援任務', incidentNumber: 'INC-2025-00089', date: '2025/12/15', facilitator: '王組長', participants: 8, lessonsLearned: 4, actionItems: 6 },
];

export default function AARPage() {
    const [selectedAAR, setSelectedAAR] = useState<string | null>(null);

    return (
        <PageTemplate
            title="AAR 檢討"
            subtitle="After Action Review - 任務後檢討與經驗學習"
            icon={FileCheck}
            domain="C2 指揮控制"
        >
            <div className="aar-page">
                {/* AAR List */}
                <div className="aar-list">
                    <div className="list-header">
                        <h3>檢討報告列表</h3>
                        <button className="btn-new">+ 新增 AAR</button>
                    </div>
                    {MOCK_AARS.map(aar => (
                        <div
                            key={aar.id}
                            className={`aar-item ${selectedAAR === aar.id ? 'selected' : ''}`}
                            onClick={() => setSelectedAAR(aar.id)}
                        >
                            <div className="aar-main">
                                <h4>{aar.title}</h4>
                                <span className="incident-ref">{aar.incidentNumber}</span>
                            </div>
                            <div className="aar-meta">
                                <span><Calendar size={12} /> {aar.date}</span>
                                <span><Users size={12} /> {aar.participants} 人</span>
                            </div>
                            <div className="aar-stats">
                                <span className="stat lessons">
                                    <Lightbulb size={14} />
                                    {aar.lessonsLearned} 經驗
                                </span>
                                <span className="stat actions">
                                    <FileCheck size={14} />
                                    {aar.actionItems} 行動項目
                                </span>
                            </div>
                            <ChevronRight size={16} className="chevron" />
                        </div>
                    ))}
                </div>

                {/* AAR Framework Guide */}
                <div className="aar-guide">
                    <h3>AAR 四大問題框架</h3>
                    <div className="framework-cards">
                        <div className="framework-card">
                            <div className="card-icon planned">1</div>
                            <div className="card-content">
                                <h4>我們原本計劃做什麼？</h4>
                                <p>回顧任務目標、預期成果、行動計劃</p>
                            </div>
                        </div>
                        <div className="framework-card">
                            <div className="card-icon actual">2</div>
                            <div className="card-content">
                                <h4>實際發生了什麼事？</h4>
                                <p>客觀描述事件經過，不做評價</p>
                            </div>
                        </div>
                        <div className="framework-card">
                            <div className="card-icon why">3</div>
                            <div className="card-content">
                                <h4>為什麼會這樣？</h4>
                                <p>分析成功與失敗的根本原因</p>
                            </div>
                        </div>
                        <div className="framework-card">
                            <div className="card-icon improve">4</div>
                            <div className="card-content">
                                <h4>下次如何改進？</h4>
                                <p>制定具體可執行的改進行動</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageTemplate>
    );
}
