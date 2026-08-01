/**
 * SimulationPage.tsx
 *
 * 模擬引擎頁面 - 災害模擬與推演
 *
 * R3b 重建（DESIGN_LANGUAGE.md）：custom / Detail-base archetype（模擬控制與結果展示，
 * 尚無互動控制項與真實運算結果，故以說明卡片呈現規劃中的能力）。
 */
import { AlertTriangle, Play, Settings, BarChart3, Waves, Mountain, Building2, ClipboardList } from 'lucide-react';
import { Alert, Card } from '../design-system';
import './SimulationPage.css';

const SIMULATION_TYPES = [
    { icon: Waves, title: '水災模擬', desc: '淹水範圍預估' },
    { icon: Mountain, title: '土石流模擬', desc: '潛勢區預警' },
    { icon: Building2, title: '地震模擬', desc: '結構損壞評估' },
    { icon: ClipboardList, title: '桌上推演', desc: '情境演練設計' },
];

const EXPECTED_FEATURES = [
    { icon: Play, title: '情境執行', desc: '即時模擬執行與暫停' },
    { icon: Settings, title: '參數調校', desc: '災害強度與範圍設定' },
    { icon: BarChart3, title: '結果分析', desc: '損失評估報告生成' },
];

export default function SimulationPage() {
    return (
        <div className="simulation-page">
            <header className="page-header">
                <h1>模擬引擎</h1>
                <p className="page-header__subtitle">災害情境模擬、桌上推演、能力評核</p>
            </header>

            <Alert variant="info" icon={<AlertTriangle size={16} aria-hidden="true" />} title="模擬功能開發中">
                災害模擬引擎正在開發中，預計包含：洪水範圍預估、地震損害評估、桌上推演設計器等功能。
            </Alert>

            <section className="simulation-types" aria-label="規劃中的模擬類型">
                <div className="simulation-types__grid">
                    {SIMULATION_TYPES.map((type) => (
                        <Card key={type.title} padding="md" className="simulation-card">
                            <type.icon size={28} aria-hidden="true" />
                            <div className="simulation-card__title">{type.title}</div>
                            <div className="simulation-card__desc">{type.desc}</div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* 預期功能區塊 */}
            <section className="expected-features">
                <h2 className="expected-features__title">預期功能</h2>
                <div className="expected-features__grid">
                    {EXPECTED_FEATURES.map((feature) => (
                        <Card key={feature.title} padding="md" className="feature-card">
                            <feature.icon size={24} aria-hidden="true" />
                            <div className="feature-card__title">{feature.title}</div>
                            <div className="feature-card__desc">{feature.desc}</div>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
