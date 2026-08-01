/**
 * UnifiedReportingPage.tsx
 *
 * 綜合報表頁面 - 跨領域報表生成
 *
 * R3b 重建（DESIGN_LANGUAGE.md）：List archetype（stat 摘要列 + 內容清單，dashboard-ish）。
 * 本頁尚無真實資料來源／後端端點，維持誠實的「建置中」狀態呈現
 * （§4：空狀態一律用 EmptyState），不再顯示虛構的統計數字。
 */
import { FileText, TrendingUp, Printer, Construction } from 'lucide-react';
import { Alert, Card } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import './UnifiedReportingPage.css';

const EXPECTED_FEATURES = [
    { icon: FileText, title: 'SITREP 生成', desc: '自動化情況報告' },
    { icon: TrendingUp, title: '趨勢分析', desc: '歷史資料對比' },
    { icon: Printer, title: '報表輸出', desc: 'PDF / Excel 匯出' },
];

export default function UnifiedReportingPage() {
    return (
        <div className="unified-reporting-page">
            <header className="page-header">
                <h1>綜合報表</h1>
                <p className="page-header__subtitle">跨領域整合報表、SITREP、事件摘要</p>
            </header>

            <Alert variant="info" title="報表功能開發中">
                綜合報表系統正在開發中，預計包含：SITREP 自動生成、AAR 範本、資料視覺化儀表板等功能。
                下列統計數字尚未接上真實資料來源，暫不顯示。
            </Alert>

            <section className="panel" aria-label="報表列表">
                <EmptyState
                    icon={Construction}
                    variant="minimal"
                    title="報表列表建置中"
                    description="此功能尚未串接後端資料，目前無法產生或檢視報表。"
                />
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
