/**
 * Breadcrumb Navigation Component
 * 
 * Auto-generated breadcrumb navigation based on route
 * v1.0
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumb.module.css';

interface BreadcrumbItem {
    label: string;
    path: string;
    isActive: boolean;
}

// Route to label mapping
const ROUTE_LABELS: Record<string, string> = {
    '': '首頁',
    'command-center': '指揮中心',
    'geo': '地理情資',
    'map-ops': '戰術地圖',
    'alerts': 'NCDR 警報',
    'weather': '天氣預報',
    'domains': '功能模組',
    'mission-command': '任務指揮',
    'task-dispatch': '任務派遣',
    'incidents': '事件管理',
    'drills': '演練管理',
    'workforce': '人力資源',
    'people': '人員管理',
    'shifts': '班表管理',
    'performance': '績效排行',
    'attendance': '出勤紀錄',
    'logistics': '後勤物資',
    'inventory': '物資庫存',
    'equipment': '裝備管理',
    'donations': '捐贈管理',
    'community': '社區服務',
    'hub': '社區中心',
    'mental-health': '心理健康',
    'analytics': '數據分析',
    'reports': '報表中心',
    'knowledge': '知識管理',
    'manuals': '知識庫',
    'governance': '系統管理',
    'permissions': '權限管理',
    'settings': '系統設定',
    'account': '我的帳戶',
    'admin': '管理後台',
    'audit-logs': '稽核日誌',
};

export const Breadcrumb: React.FC = () => {
    const location = useLocation();

    const breadcrumbs = useMemo((): BreadcrumbItem[] => {
        const pathParts = location.pathname.split('/').filter(Boolean);

        if (pathParts.length === 0) {
            return [];
        }

        const items: BreadcrumbItem[] = [];
        let currentPath = '';

        for (let i = 0; i < pathParts.length; i++) {
            const segment = pathParts[i];
            currentPath += `/${segment}`;

            const label = ROUTE_LABELS[segment] || segment;
            const isActive = i === pathParts.length - 1;

            items.push({
                label,
                path: currentPath,
                isActive,
            });
        }

        return items;
    }, [location.pathname]);

    // Don't show breadcrumb on home page
    if (breadcrumbs.length === 0) {
        return null;
    }

    return (
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <ol className={styles.list}>
                {/* Home link */}
                <li className={styles.item}>
                    <Link to="/" className={styles.link}>
                        <Home size={14} />
                        <span className={styles.homeText}>首頁</span>
                    </Link>
                </li>

                {/* Path segments */}
                {breadcrumbs.map((item, index) => (
                    <li key={item.path} className={styles.item}>
                        <ChevronRight size={14} className={styles.separator} />
                        {item.isActive ? (
                            <span className={styles.current} aria-current="page">
                                {item.label}
                            </span>
                        ) : (
                            <Link to={item.path} className={styles.link}>
                                {item.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumb;
