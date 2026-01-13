/**
 * Command Palette (Cmd+K)
 * 
 * Quick navigation and search across the entire application
 * v1.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search,
    Command,
    X,
    ChevronRight,
    Map,
    Users,
    Package,
    Shield,
    BarChart2,
    Settings,
    BookOpen,
    AlertTriangle,
    Home,
    User,
    Bell,
    Calendar,
    Cpu,
} from 'lucide-react';
import styles from './CommandPalette.module.css';

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    path?: string;
    action?: () => void;
    icon?: React.ReactNode;
    category: string;
    keywords?: string[];
}

// Page index for search
const PAGE_INDEX: CommandItem[] = [
    // Dashboard
    { id: 'command-center', label: '指揮中心', path: '/command-center', icon: <Home size={18} />, category: '主要', keywords: ['dashboard', 'home', '首頁'] },

    // Geo-Intel
    { id: 'map-ops', label: '戰術地圖', path: '/geo/map-ops', icon: <Map size={18} />, category: '地理情資', keywords: ['map', '地圖', 'gis'] },
    { id: 'alerts', label: 'NCDR 警報', path: '/geo/alerts', icon: <AlertTriangle size={18} />, category: '地理情資', keywords: ['ncdr', '警報', 'alert'] },
    { id: 'weather', label: '天氣預報', path: '/geo/weather', icon: <AlertTriangle size={18} />, category: '地理情資', keywords: ['weather', '天氣', '預報'] },

    // Mission Command
    { id: 'task-dispatch', label: '任務派遣', path: '/domains/mission-command/task-dispatch', icon: <Cpu size={18} />, category: '任務指揮', keywords: ['task', '任務', '派遣'] },
    { id: 'incidents', label: '事件管理', path: '/domains/mission-command/incidents', icon: <AlertTriangle size={18} />, category: '任務指揮', keywords: ['incident', '事件'] },
    { id: 'drills', label: '演練管理', path: '/domains/mission-command/drills', icon: <Calendar size={18} />, category: '任務指揮', keywords: ['drill', '演練', '訓練'] },

    // Workforce
    { id: 'personnel', label: '人員管理', path: '/workforce/people', icon: <Users size={18} />, category: '人力資源', keywords: ['people', '人員', '志工'] },
    { id: 'shifts', label: '班表管理', path: '/workforce/shifts', icon: <Calendar size={18} />, category: '人力資源', keywords: ['shift', '班表', '排班'] },
    { id: 'leaderboard', label: '績效排行', path: '/workforce/performance', icon: <BarChart2 size={18} />, category: '人力資源', keywords: ['leaderboard', '排行', '績效'] },

    // Logistics
    { id: 'inventory', label: '物資庫存', path: '/logistics/inventory', icon: <Package size={18} />, category: '後勤物資', keywords: ['inventory', '庫存', '物資'] },
    { id: 'equipment', label: '裝備管理', path: '/logistics/equipment', icon: <Package size={18} />, category: '後勤物資', keywords: ['equipment', '裝備'] },
    { id: 'donations', label: '捐贈管理', path: '/logistics/donations', icon: <Package size={18} />, category: '後勤物資', keywords: ['donation', '捐贈'] },

    // Community
    { id: 'community-hub', label: '社區中心', path: '/community/hub', icon: <Users size={18} />, category: '社區服務', keywords: ['community', '社區'] },
    { id: 'mental-health', label: '心理健康', path: '/community/mental-health', icon: <Shield size={18} />, category: '社區服務', keywords: ['mental', '心理', 'health'] },

    // Analytics
    { id: 'reports', label: '報表中心', path: '/analytics/reports', icon: <BarChart2 size={18} />, category: '數據分析', keywords: ['report', '報表', 'analytics'] },

    // Knowledge
    { id: 'manuals', label: '知識庫', path: '/knowledge/manuals', icon: <BookOpen size={18} />, category: '知識管理', keywords: ['manual', '手冊', '知識'] },

    // Settings & Account
    { id: 'account', label: '我的帳戶', path: '/account', icon: <User size={18} />, category: '設定', keywords: ['account', '帳戶', 'profile'] },
    { id: 'notifications', label: '通知中心', path: '/hub/notifications', icon: <Bell size={18} />, category: '設定', keywords: ['notification', '通知'] },
    { id: 'permissions', label: '權限管理', path: '/governance/permissions', icon: <Shield size={18} />, category: '設定', keywords: ['permission', '權限'] },
    { id: 'settings', label: '系統設定', path: '/governance/settings', icon: <Settings size={18} />, category: '設定', keywords: ['settings', '設定'] },
];

export const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Filter results based on query
    const filteredResults = useMemo(() => {
        if (!query.trim()) {
            return PAGE_INDEX.slice(0, 10);
        }

        const lowerQuery = query.toLowerCase();
        return PAGE_INDEX.filter(item => {
            const matchLabel = item.label.toLowerCase().includes(lowerQuery);
            const matchDesc = item.description?.toLowerCase().includes(lowerQuery);
            const matchKeywords = item.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
            const matchPath = item.path?.toLowerCase().includes(lowerQuery);
            return matchLabel || matchDesc || matchKeywords || matchPath;
        }).slice(0, 15);
    }, [query]);

    // Group results by category
    const groupedResults = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {};
        filteredResults.forEach(item => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });
        return groups;
    }, [filteredResults]);

    // Handle keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            // Escape to close
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Close on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Handle navigation
    const handleSelect = useCallback((item: CommandItem) => {
        if (item.path) {
            navigate(item.path);
        } else if (item.action) {
            item.action();
        }
        setIsOpen(false);
    }, [navigate]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredResults[selectedIndex]) {
                handleSelect(filteredResults[selectedIndex]);
            }
        }
    }, [filteredResults, selectedIndex, handleSelect]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
            <div className={styles.palette} onClick={e => e.stopPropagation()}>
                {/* Search Input */}
                <div className={styles.searchWrapper}>
                    <Search size={20} className={styles.searchIcon} />
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder="搜尋頁面、功能..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <div className={styles.shortcut}>
                        <kbd>ESC</kbd>
                    </div>
                    <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                        <X size={18} />
                    </button>
                </div>

                {/* Results */}
                <div className={styles.results}>
                    {filteredResults.length === 0 ? (
                        <div className={styles.noResults}>
                            找不到符合「{query}」的結果
                        </div>
                    ) : (
                        Object.entries(groupedResults).map(([category, items]) => (
                            <div key={category} className={styles.group}>
                                <div className={styles.groupLabel}>{category}</div>
                                {items.map((item, i) => {
                                    const globalIndex = filteredResults.indexOf(item);
                                    return (
                                        <button
                                            key={item.id}
                                            className={`${styles.resultItem} ${globalIndex === selectedIndex ? styles.selected : ''}`}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                                        >
                                            <span className={styles.itemIcon}>{item.icon}</span>
                                            <span className={styles.itemLabel}>{item.label}</span>
                                            {item.description && (
                                                <span className={styles.itemDesc}>{item.description}</span>
                                            )}
                                            <ChevronRight size={14} className={styles.itemArrow} />
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <div className={styles.footerHint}>
                        <kbd>↑</kbd><kbd>↓</kbd> 導航
                        <span className={styles.footerDivider}>|</span>
                        <kbd>Enter</kbd> 選擇
                        <span className={styles.footerDivider}>|</span>
                        <kbd>ESC</kbd> 關閉
                    </div>
                    <div className={styles.footerBrand}>
                        <Command size={14} /> Command Palette
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
