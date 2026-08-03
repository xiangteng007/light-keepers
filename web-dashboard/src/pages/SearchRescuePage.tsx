/**
 * SearchRescuePage.tsx
 *
 * 搜救任務管理頁面 - 山搜/水域/城市倒塌搜救
 *
 * R3a 重設計：移除原本的假資料統計卡（3 進行中任務 / 24 出勤人員 / 12 已救援，
 * 皆為寫死數字，非 API 回傳），改為誠實的「頁面建置中」狀態（DESIGN_LANGUAGE §0.1、§4）。
 * 下方保留「預期功能」卡片作為規劃預覽，不冒充即時資料。
 */
/* Construction(建置中) 無 B3c 對應，誠實保留；EmptyState 的 icon prop 型別鎖 LucideIcon */
import { Construction } from 'lucide-react';
import { LocationIcon, TeamsIcon, PlusIcon } from '../design-system/icons';
import EmptyState from '../components/shared/EmptyState';
import { Card } from '../design-system';
import './SearchRescuePage.css';

const PLANNED_FEATURES = [
    {
        icon: LocationIcon,
        title: '任務地圖',
        description: '即時搜救範圍與人員位置',
    },
    {
        icon: TeamsIcon,
        title: '人員調度',
        description: '搜救小隊分配與追蹤',
    },
    {
        icon: PlusIcon,
        title: '新增任務',
        description: '快速建立搜救任務',
    },
];

export default function SearchRescuePage() {
    return (
        <div className="search-rescue-page">
            <header className="search-rescue-page__header">
                <h1 className="search-rescue-page__title">搜救任務</h1>
                <p className="search-rescue-page__subtitle">
                    山搜、水域、城市倒塌結構救援任務管理
                </p>
            </header>

            <EmptyState
                icon={Construction}
                variant="minimal"
                title="頁面建置中"
                description="搜救任務管理系統正在開發中，預計包含：任務建立、GPS 追蹤、人員調度、即時通訊等功能。"
            />

            <section className="search-rescue-page__preview">
                <h2 className="search-rescue-page__preview-title">預期功能</h2>
                <div className="search-rescue-page__preview-grid">
                    {PLANNED_FEATURES.map(({ icon: Icon, title, description }) => (
                        <Card key={title} padding="md">
                            <div className="search-rescue-page__feature">
                                <Icon size={24} className="search-rescue-page__feature-icon" aria-hidden="true" />
                                <div className="search-rescue-page__feature-title">{title}</div>
                                <div className="search-rescue-page__feature-desc">{description}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
