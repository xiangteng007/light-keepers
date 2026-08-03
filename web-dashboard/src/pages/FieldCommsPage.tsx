/**
 * FieldCommsPage.tsx
 *
 * 現地通訊頁面 - 無線電/弱網/衛星備援
 *
 * R3a 重設計：移除原本的假資料狀態卡（5/5 通訊頻道在線 / 85% Mesh 網路覆蓋，
 * 皆為寫死數字，非 API 回傳）——在災防情境下假造通訊暢通狀態特別危險，違反
 * DESIGN_LANGUAGE §0「高壓可用性 > 美觀」原則，改為誠實的「頁面建置中」狀態（§4）。
 * 下方保留「預期功能」卡片作為規劃預覽，不冒充即時資料。
 */
/* Construction(建置中)/Satellite(衛星) 無 B3c 對應，誠實保留（見 notes）；
   EmptyState 的 icon prop 型別鎖 LucideIcon */
import { Construction, Satellite } from 'lucide-react';
import { RadioIcon, OnlineIcon } from '../design-system/icons';
import EmptyState from '../components/shared/EmptyState';
import { Card } from '../design-system';
import './FieldCommsPage.css';

const PLANNED_FEATURES = [
    {
        icon: RadioIcon,
        title: '無線電管理',
        description: '頻道分配與通話紀錄',
    },
    {
        icon: OnlineIcon,
        title: 'Mesh 網路',
        description: '節點狀態與拓撲圖',
    },
    {
        icon: Satellite,
        title: '衛星備援',
        description: 'Starlink / Iridium 整合',
    },
];

export default function FieldCommsPage() {
    return (
        <div className="field-comms-page">
            <header className="field-comms-page__header">
                <h1 className="field-comms-page__title">現地通訊</h1>
                <p className="field-comms-page__subtitle">
                    無線電通訊、弱網環境、衛星備援通訊管理
                </p>
            </header>

            <EmptyState
                icon={Construction}
                variant="minimal"
                title="頁面建置中"
                description="通訊系統正在開發中，預計包含：無線電頻道管理、衛星通訊備援、Mesh 網路狀態監控等功能。"
            />

            <section className="field-comms-page__preview">
                <h2 className="field-comms-page__preview-title">預期功能</h2>
                <div className="field-comms-page__preview-grid">
                    {PLANNED_FEATURES.map(({ icon: Icon, title, description }) => (
                        <Card key={title} padding="md">
                            <div className="field-comms-page__feature">
                                <Icon size={24} className="field-comms-page__feature-icon" aria-hidden="true" />
                                <div className="field-comms-page__feature-title">{title}</div>
                                <div className="field-comms-page__feature-desc">{description}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
