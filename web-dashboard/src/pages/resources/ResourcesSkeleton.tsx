/**
 * ResourcesSkeleton.tsx — 物資管理子分頁共用載入骨架
 *
 * 取代 WarehousesTab / AssetsTab / DispatchTab / AuditTab 各自的
 * `<div className="loading-state"><div className="spinner"/>...</div>` 自刻 spinner。
 * DESIGN_LANGUAGE.md §7.1：載入用 skeleton row（≥3 列），不用自刻 spinner。
 * 樣式定義於 ResourcesSkeleton.css，全部使用語義 token，三態自動生效。
 */
import './ResourcesSkeleton.css';

export function ResourcesTabSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="resources-tab-skeleton" role="status" aria-label="載入中" aria-busy="true">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="resources-tab-skeleton__row">
                    <span className="resources-tab-skeleton__bar" />
                    <span className="resources-tab-skeleton__bar resources-tab-skeleton__bar--sm" />
                </div>
            ))}
        </div>
    );
}

export default ResourcesTabSkeleton;
