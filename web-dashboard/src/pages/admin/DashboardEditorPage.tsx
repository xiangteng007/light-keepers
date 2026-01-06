/**
 * Dashboard Editor Page
 * Drag-and-drop dashboard customization
 */

import React, { useState, useEffect } from 'react';
import './DashboardEditorPage.css';

interface WidgetDefinition {
    id: string;
    type: string;
    name: string;
    icon: string;
    defaultSize: { width: number; height: number };
}

interface PlacedWidget {
    id: string;
    widgetType: string;
    position: { row: number; col: number };
    size: { width: number; height: number };
}

const AVAILABLE_WIDGETS: WidgetDefinition[] = [
    { id: 'stats', type: 'stats-overview', name: '統計概覽', icon: '📊', defaultSize: { width: 2, height: 1 } },
    { id: 'activity', type: 'recent-activity', name: '最近活動', icon: '📝', defaultSize: { width: 2, height: 2 } },
    { id: 'sos', type: 'sos-monitor', name: 'SOS 監控', icon: '🚨', defaultSize: { width: 2, height: 2 } },
    { id: 'weather', type: 'weather-alerts', name: '天氣警報', icon: '🌧️', defaultSize: { width: 2, height: 2 } },
    { id: 'tasks', type: 'task-list', name: '待辦任務', icon: '✅', defaultSize: { width: 2, height: 2 } },
    { id: 'map', type: 'map-preview', name: '地圖預覽', icon: '🗺️', defaultSize: { width: 3, height: 3 } },
    { id: 'actions', type: 'quick-actions', name: '快速操作', icon: '⚡', defaultSize: { width: 2, height: 1 } },
    { id: 'chart', type: 'analytics-chart', name: '分析圖表', icon: '📈', defaultSize: { width: 3, height: 2 } },
];

const DashboardEditorPage: React.FC = () => {
    const [placedWidgets, setPlacedWidgets] = useState<PlacedWidget[]>([]);
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [layoutName, setLayoutName] = useState('我的儀表板');
    const [saving, setSaving] = useState(false);

    const gridRows = 6;
    const gridCols = 4;

    useEffect(() => {
        loadLayout();
    }, []);

    const loadLayout = async () => {
        try {
            const response = await fetch('/api/dashboard/layout');
            if (response.ok) {
                const data = await response.json();
                if (data.data?.widgets) {
                    setPlacedWidgets(data.data.widgets);
                    setLayoutName(data.data.name || '我的儀表板');
                }
            }
        } catch (error) {
            console.error('Failed to load layout:', error);
        }
    };

    const saveLayout = async () => {
        setSaving(true);
        try {
            await fetch('/api/dashboard/layout', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: layoutName,
                    widgets: placedWidgets,
                }),
            });
            alert('儀表板已儲存');
        } catch (error) {
            console.error('Failed to save layout:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDragStart = (widgetType: string) => {
        setIsDragging(true);
        setSelectedWidget(widgetType);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const handleCellDrop = (row: number, col: number) => {
        if (!selectedWidget) return;

        const widgetDef = AVAILABLE_WIDGETS.find(w => w.type === selectedWidget);
        if (!widgetDef) return;

        const newWidget: PlacedWidget = {
            id: `widget-${Date.now()}`,
            widgetType: selectedWidget,
            position: { row, col },
            size: widgetDef.defaultSize,
        };

        setPlacedWidgets(prev => [...prev, newWidget]);
        setSelectedWidget(null);
        setIsDragging(false);
    };

    const removeWidget = (widgetId: string) => {
        setPlacedWidgets(prev => prev.filter(w => w.id !== widgetId));
    };

    const resetLayout = () => {
        if (confirm('確定要重設儀表板配置嗎？')) {
            setPlacedWidgets([]);
        }
    };

    const getWidgetStyle = (widget: PlacedWidget): React.CSSProperties => ({
        gridRow: `${widget.position.row + 1} / span ${widget.size.height}`,
        gridColumn: `${widget.position.col + 1} / span ${widget.size.width}`,
    });

    const getWidgetInfo = (type: string) => {
        return AVAILABLE_WIDGETS.find(w => w.type === type);
    };

    return (
        <div className="dashboard-editor-page">
            <header className="editor-header">
                <div className="editor-title">
                    <h1>🎨 儀表板編輯器</h1>
                    <input
                        type="text"
                        className="layout-name-input"
                        value={layoutName}
                        onChange={e => setLayoutName(e.target.value)}
                        placeholder="儀表板名稱"
                    />
                </div>
                <div className="editor-actions">
                    <button className="reset-btn" onClick={resetLayout}>
                        🔄 重設
                    </button>
                    <button
                        className="save-btn"
                        onClick={saveLayout}
                        disabled={saving}
                    >
                        {saving ? '儲存中...' : '💾 儲存配置'}
                    </button>
                </div>
            </header>

            <div className="editor-content">
                <aside className="widget-palette">
                    <h2>可用元件</h2>
                    <p className="palette-hint">拖曳元件到右側網格</p>
                    <div className="widget-list">
                        {AVAILABLE_WIDGETS.map(widget => (
                            <div
                                key={widget.id}
                                className="widget-item"
                                draggable
                                onDragStart={() => handleDragStart(widget.type)}
                                onDragEnd={handleDragEnd}
                            >
                                <span className="widget-icon">{widget.icon}</span>
                                <span className="widget-name">{widget.name}</span>
                                <span className="widget-size">
                                    {widget.defaultSize.width}×{widget.defaultSize.height}
                                </span>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="grid-area">
                    <div
                        className={`grid-container ${isDragging ? 'dragging' : ''}`}
                        style={{
                            gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                        }}
                    >
                        {/* Grid cells for dropping */}
                        {Array.from({ length: gridRows * gridCols }).map((_, index) => {
                            const row = Math.floor(index / gridCols);
                            const col = index % gridCols;
                            return (
                                <div
                                    key={`cell-${row}-${col}`}
                                    className="grid-cell"
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => handleCellDrop(row, col)}
                                />
                            );
                        })}

                        {/* Placed widgets */}
                        {placedWidgets.map(widget => {
                            const widgetInfo = getWidgetInfo(widget.widgetType);
                            return (
                                <div
                                    key={widget.id}
                                    className="placed-widget"
                                    style={getWidgetStyle(widget)}
                                >
                                    <div className="widget-content">
                                        <span className="widget-icon">{widgetInfo?.icon}</span>
                                        <span className="widget-label">{widgetInfo?.name}</span>
                                    </div>
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeWidget(widget.id)}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid-legend">
                        <span>📐 網格: {gridCols} 欄 × {gridRows} 列</span>
                        <span>🧩 已放置: {placedWidgets.length} 個元件</span>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardEditorPage;
