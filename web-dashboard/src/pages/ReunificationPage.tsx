/**
 * ReunificationPage.tsx
 *
 * 家庭團聚頁面 - 失蹤協尋、尋獲通報
 *
 * 目前功能尚未串接後端資料，改為誠實顯示「頁面建置中」。
 * 不得在此頁顯示虛構統計數字（DESIGN_LANGUAGE.md §0 高壓可用性 > 美觀 / 資料誠實性）。
 */
import { Construction } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';
import './ReunificationPage.css';

export default function ReunificationPage() {
    return (
        <div className="reunification-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h1 className="reunification-page__title">家庭團聚</h1>
                    <p className="page-subtitle">失蹤協尋、尋獲通報、家庭團聚管理</p>
                </div>
            </div>

            <div className="reunification-page__body">
                <EmptyState
                    icon={Construction}
                    title="頁面建置中"
                    description="此頁面規劃提供失蹤協尋通報、尋獲通報登記與家庭團聚案件管理功能，目前尚未開放，敬請期待。"
                />
            </div>
        </div>
    );
}
