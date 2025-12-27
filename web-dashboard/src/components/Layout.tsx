import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    LayoutDashboard,
    BarChart3,
    AlertTriangle,
    Siren,
    ClipboardList,
    Map,
    BookOpen,
    MessageSquareWarning,
    CheckSquare,
    FileDown,
    Users,
    CalendarDays,
    GraduationCap,
    Package,
    Bell,
    Menu,
    X,
    GripVertical,
    LogOut,
    User,
    Shield,
    Edit3,
    Save,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logoImage from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import { getMenuConfig, updateMenuConfig, getTasks } from '../api/services';

interface NavItem {
    id: string;
    path: string;
    label: string;
    icon: LucideIcon;
    requiredLevel: number; // 0=公開, 1=志工, 2=幹部, 3=常務理事, 4=理事長, 5=系統擁有者
}

const defaultNavItems: NavItem[] = [
    { id: 'dashboard', path: '/dashboard', label: '儀表板', icon: LayoutDashboard, requiredLevel: 1 },
    { id: 'analytics', path: '/analytics', label: '數據分析', icon: BarChart3, requiredLevel: 3 },
    { id: 'ncdr-alerts', path: '/ncdr-alerts', label: '災害示警', icon: AlertTriangle, requiredLevel: 0 },
    { id: 'events', path: '/events', label: '災害回報', icon: Siren, requiredLevel: 1 },
    { id: 'tasks', path: '/tasks', label: '任務管理', icon: ClipboardList, requiredLevel: 2 },
    { id: 'map', path: '/map', label: '地圖總覽', icon: Map, requiredLevel: 0 },
    { id: 'manuals', path: '/manuals', label: '實務手冊', icon: BookOpen, requiredLevel: 0 },
    { id: 'report', path: '/report', label: '回報系統', icon: MessageSquareWarning, requiredLevel: 1 },
    { id: 'reports-admin', path: '/reports/admin', label: '回報審核', icon: CheckSquare, requiredLevel: 2 },
    { id: 'reports-export', path: '/reports/export', label: '報表匯出', icon: FileDown, requiredLevel: 3 },
    { id: 'volunteers', path: '/volunteers', label: '志工管理', icon: Users, requiredLevel: 2 },
    { id: 'volunteers-schedule', path: '/volunteers/schedule', label: '志工排班', icon: CalendarDays, requiredLevel: 2 },
    { id: 'training', path: '/training', label: '培訓中心', icon: GraduationCap, requiredLevel: 1 },
    { id: 'resources', path: '/resources', label: '物資管理', icon: Package, requiredLevel: 2 },
    { id: 'notifications', path: '/notifications', label: '通知中心', icon: Bell, requiredLevel: 1 },
    { id: 'permissions', path: '/permissions', label: '權限管理', icon: Shield, requiredLevel: 4 },
];

// Sortable Nav Item Component
function SortableNavItem({
    item,
    isActive,
    onClick,
    isEditMode,
    onLabelChange,
}: {
    item: NavItem;
    isActive: boolean;
    onClick: () => void;
    isEditMode: boolean;
    onLabelChange?: (id: string, label: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 1000 : 'auto',
    };

    const IconComponent = item.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`nav-item-wrapper ${isDragging ? 'dragging' : ''}`}
        >
            <div
                className="nav-item-drag-handle"
                {...attributes}
                {...listeners}
            >
                <GripVertical size={14} />
            </div>
            {isEditMode ? (
                <div className={`nav-item nav-item--editing ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon">
                        <IconComponent size={20} strokeWidth={1.5} />
                    </span>
                    <input
                        type="text"
                        className="nav-label-input"
                        value={item.label}
                        onChange={(e) => onLabelChange?.(item.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            ) : (
                <Link
                    to={item.path}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={onClick}
                >
                    <span className="nav-icon">
                        <IconComponent size={20} strokeWidth={1.5} />
                    </span>
                    <span className="nav-label">{item.label}</span>
                </Link>
            )}
        </div>
    );
}

// Storage key for nav order (fallback for non-owners)
const NAV_ORDER_KEY = 'light-keepers-nav-order';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalItems, setOriginalItems] = useState<NavItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Get user's role level (default to 1 for logged in users)
    const userLevel = user?.roleLevel ?? 1;
    const isOwner = userLevel >= 5;

    // Filter nav items based on user's role level
    const visibleNavItems = navItems.filter(item => item.requiredLevel <= userLevel);

    // 登入任務提醒 - 顯示用戶待處理的任務數量
    useEffect(() => {
        const checkPendingTasks = async () => {
            if (!user?.id) return;

            try {
                const response = await getTasks({ status: 'pending', limit: 50 });
                const allPendingTasks = response.data?.data || [];
                // 過濾出分配給當前用戶的任務
                const myTasks = allPendingTasks.filter(t => t.assignedTo === user.id);

                if (myTasks.length > 0) {
                    // 使用 setTimeout 避免太快顯示
                    setTimeout(() => {
                        alert(`📋 您有 ${myTasks.length} 個待處理的任務！請前往「任務管理」查看。`);
                    }, 1000);
                }
            } catch (error) {
                console.error('Failed to check pending tasks:', error);
            }
        };

        // 只在首次登入時檢查
        const hasChecked = sessionStorage.getItem(`task-reminder-${user?.id}`);
        if (!hasChecked && user?.id) {
            checkPendingTasks();
            sessionStorage.setItem(`task-reminder-${user?.id}`, 'true');
        }
    }, [user?.id]);

    // Load menu config from backend
    useEffect(() => {
        const loadMenuConfig = async () => {
            try {
                const response = await getMenuConfig();
                if (response.data?.data && response.data.data.length > 0) {
                    const configObj: Record<string, { id: string; label: string; order: number }> = {};
                    response.data.data.forEach((c) => { configObj[c.id] = c; });
                    const configMap = configObj;

                    // Apply config to nav items
                    const configuredItems = defaultNavItems.map(item => {
                        const config = configMap[item.id];
                        if (config) {
                            return { ...item, label: config.label };
                        }
                        return item;
                    });

                    // Sort by order if available
                    configuredItems.sort((a, b) => {
                        const orderA = configMap[a.id]?.order ?? 999;
                        const orderB = configMap[b.id]?.order ?? 999;
                        return orderA - orderB;
                    });

                    setNavItems(configuredItems);
                } else {
                    // Fallback to localStorage
                    loadFromLocalStorage();
                }
            } catch (error) {
                console.error('Failed to load menu config:', error);
                loadFromLocalStorage();
            }
        };

        const loadFromLocalStorage = () => {
            const savedOrder = localStorage.getItem(NAV_ORDER_KEY);
            if (savedOrder) {
                try {
                    const orderIds = JSON.parse(savedOrder) as string[];
                    const orderedItems = orderIds
                        .map(id => defaultNavItems.find(item => item.id === id))
                        .filter((item): item is NavItem => item !== undefined);
                    const newItems = defaultNavItems.filter(
                        item => !orderIds.includes(item.id)
                    );
                    setNavItems([...orderedItems, ...newItems]);
                } catch (e) {
                    console.error('Failed to parse nav order:', e);
                }
            }
        };

        loadMenuConfig();
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setNavItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Only save to localStorage for non-owners or when not in edit mode
                if (!isOwner || !isEditMode) {
                    const orderIds = newOrder.map(item => item.id);
                    localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(orderIds));
                }

                return newOrder;
            });
        }
    };

    const handleLabelChange = (id: string, newLabel: string) => {
        setNavItems(items =>
            items.map(item =>
                item.id === id ? { ...item, label: newLabel } : item
            )
        );
    };

    const handleStartEdit = () => {
        setOriginalItems([...navItems]);
        setIsEditMode(true);
    };

    const handleCancelEdit = () => {
        setNavItems(originalItems);
        setIsEditMode(false);
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            const configItems = navItems.map((item, index) => ({
                id: item.id,
                label: item.label,
                order: index,
            }));
            await updateMenuConfig(configItems);
            setIsEditMode(false);
        } catch (error) {
            console.error('Failed to save menu config:', error);
            alert('儲存失敗，請稍後再試');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNavClick = () => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <button
                    className="hamburger-btn"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle menu"
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <div className="mobile-header__title">Light Keepers</div>
                <div className="mobile-header__actions">
                    <Link to="/notifications" className="mobile-header__icon">
                        <Bell size={20} />
                    </Link>
                    <div className="mobile-header__avatar">A</div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
                <div className="logo">
                    <div className="logo-icon">
                        <img src={logoImage} alt="Light Keepers Logo" className="logo-image" />
                    </div>
                    <div>
                        <h1>Light Keepers</h1>
                        <div className="logo-subtitle">曦望燈塔</div>
                    </div>
                </div>

                {/* Edit Mode Controls - Owner Only */}
                {isOwner && (
                    <div className="nav-edit-controls">
                        {isEditMode ? (
                            <>
                                <button
                                    className="nav-edit-btn nav-edit-btn--save"
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                >
                                    <Save size={16} />
                                    {isSaving ? '儲存中...' : '儲存'}
                                </button>
                                <button
                                    className="nav-edit-btn nav-edit-btn--cancel"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                >
                                    <XCircle size={16} />
                                    取消
                                </button>
                            </>
                        ) : (
                            <button
                                className="nav-edit-btn nav-edit-btn--edit"
                                onClick={handleStartEdit}
                            >
                                <Edit3 size={16} />
                                編輯選單
                            </button>
                        )}
                    </div>
                )}

                <nav className="nav">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={visibleNavItems.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {visibleNavItems.map((item) => (
                                <SortableNavItem
                                    key={item.id}
                                    item={item}
                                    isActive={location.pathname === item.path}
                                    onClick={handleNavClick}
                                    isEditMode={isEditMode}
                                    onLabelChange={handleLabelChange}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </nav>

                {/* User Profile Section */}
                <div className="sidebar-user">
                    <Link to="/profile" className="sidebar-user__info" onClick={handleNavClick}>
                        <div className="sidebar-user__avatar">
                            <User size={18} />
                        </div>
                        <div className="sidebar-user__details">
                            <span className="sidebar-user__name">{user?.displayName || user?.email || '用戶'}</span>
                            <span className="sidebar-user__role">{user?.roleDisplayName || '登記志工'}</span>
                        </div>
                    </Link>
                    <button className="sidebar-user__logout" onClick={handleLogout} title="登出">
                        <LogOut size={18} />
                    </button>
                </div>

                <div className="sidebar-footer">
                    <span>v1.0.0 • 曦望燈塔救援協會</span>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
