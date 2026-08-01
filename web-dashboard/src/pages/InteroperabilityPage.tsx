/**
 * InteroperabilityPage.tsx
 *
 * 機構互通頁面 - 跨組織資料交換
 */
import { Link, Database, RefreshCw } from 'lucide-react';
import { Alert, Card, StatIndicator } from '../design-system';
import './InteroperabilityPage.css';

const FEATURES = [
    { icon: Link, title: 'API 管理', description: '外部系統連接設定' },
    { icon: Database, title: 'EDXL 訊息', description: '標準化災害訊息交換' },
    { icon: RefreshCw, title: '資料同步', description: '即時同步狀態監控' },
];

export default function InteroperabilityPage() {
    return (
        <div className="interop-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h1 className="interop-page__title">機構互通</h1>
                    <p className="page-subtitle">OCHA EDXL、EMAP 標準、跨機關資料交換</p>
                </div>
            </div>

            <Alert variant="info" title="互通功能開發中">
                機構互通系統正在開發中，預計包含：EDXL 訊息發送、EMAP 標準對接、API 管理介面等功能。
            </Alert>

            <div className="interop-page__stats">
                <StatIndicator label="已連接機構" value={4} variant="success" />
                <StatIndicator label="今日訊息" value={156} variant="default" />
                <StatIndicator label="同步成功率" value="99.2%" variant="default" />
            </div>

            <section className="panel interop-page__panel" aria-labelledby="interop-features-heading">
                <h2 id="interop-features-heading" className="interop-page__panel-title">預期功能</h2>
                <div className="interop-page__grid">
                    {FEATURES.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <Card key={feature.title} className="interop-page__feature-card">
                                <Icon size={24} aria-hidden="true" className="interop-page__feature-icon" />
                                <div className="interop-page__feature-title">{feature.title}</div>
                                <div className="interop-page__feature-desc">{feature.description}</div>
                            </Card>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
