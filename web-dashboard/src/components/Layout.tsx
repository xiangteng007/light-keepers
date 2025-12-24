import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logoImage from '../assets/logo.jpg';

interface NavItem {
    id: string;
    path: string;
    label: string;
    icon: LucideIcon;
}

const defaultNavItems: NavItem[] = [
    { id: 'dashboard', path: '/dashboard', label: '儀表板', icon: LayoutDashboard },
    { id: 'analytics', path: '/analytics', label: '數據分析', icon: BarChart3 },
    { id: 'ncdr-alerts', path: '/ncdr-alerts', label: '災害示警', icon: AlertTriangle },
    { id: 'events', path: '/events', label: '災情事件', icon: Siren },
    { id: 'tasks', path: '/tasks', label: '任務管理', icon: ClipboardList },
    { id: 'map', path: '/map', label: '地圖總覽', icon: Map },
    { id: 'manuals', path: '/manuals', label: '實務手冊', icon: BookOpen },
    { id: 'report', path: '/report', label: '回報系統', icon: MessageSquareWarning },
    { id: 'reports-admin', path: '/reports/admin', label: '回報審核', icon: CheckSquare },
    { id: 'reports-export', path: '/reports/export', label: '報表匯出', icon: FileDown },
    { id: 'volunteers', path: '/volunteers', label: '志工管理', icon: Users },
    { id: 'volunteers-schedule', path: '/volunteers/schedule', label: '志工排班', icon: CalendarDays },
    { id: 'training', path: '/training', label: '培訓中心', icon: GraduationCap },
    { id: 'resources', path: '/resources', label: '物資管理', icon: Package },
    { id: 'notifications', path: '/notifications', label: '通知中心', icon: Bell },
];

// Sortable Nav Item Component
function SortableNavItem({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void }) {
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
        </div>
    );
}

// Storage key for nav order
const NAV_ORDER_KEY = 'light-keepers-nav-order';

export default function Layout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);

    // Load saved order from localStorage
    useEffect(() => {
        const savedOrder = localStorage.getItem(NAV_ORDER_KEY);
        if (savedOrder) {
            try {
                const orderIds = JSON.parse(savedOrder) as string[];
                // Rebuild navItems based on saved order
                const orderedItems = orderIds
                    .map(id => defaultNavItems.find(item => item.id === id))
                    .filter((item): item is NavItem => item !== undefined);

                // Add any new items that weren't in the saved order
                const newItems = defaultNavItems.filter(
                    item => !orderIds.includes(item.id)
                );

                setNavItems([...orderedItems, ...newItems]);
            } catch (e) {
                console.error('Failed to parse nav order:', e);
            }
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement before drag starts
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

                // Save to localStorage
                const orderIds = newOrder.map(item => item.id);
                localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(orderIds));

                return newOrder;
            });
        }
    };

    const handleNavClick = () => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
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

                <nav className="nav">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={navItems.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {navItems.map((item) => (
                                <SortableNavItem
                                    key={item.id}
                                    item={item}
                                    isActive={location.pathname === item.path}
                                    onClick={handleNavClick}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </nav>

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
