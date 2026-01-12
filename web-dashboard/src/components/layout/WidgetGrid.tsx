/**
 * WidgetGrid.tsx
 * 
 * Grid container using react-grid-layout for drag/resize functionality
 * Note: Using 'any' types to bypass react-grid-layout TypeScript compatibility issues
 */
import React from 'react';
// @ts-ignore - react-grid-layout types have compatibility issues
import ReactGridLayout from 'react-grid-layout';
import { Widget } from './Widget';
import { WidgetConfig, WidgetModule } from './widget.types';
import 'react-grid-layout/css/styles.css';
import './WidgetGrid.css';

interface WidgetGridProps {
    widgets: WidgetConfig[];
    layout: any[];
    isEditMode: boolean;
    canEdit: boolean;
    selectedWidgetId: string | null;
    onLayoutChange: (layout: any[]) => void;
    onSelectWidget: (widgetId: string | null) => void;
    onToggleVisibility: (widgetId: string) => void;
    onToggleLock: (widgetId: string) => void;
    onTitleChange: (widgetId: string, newTitle: string) => void;
    onAddWidget: (module: WidgetModule) => void;
    onRemoveWidget: (widgetId: string) => void;
    onToggleEditMode: () => void;
    onResetLayout: () => void;
    onShowWidget: (widgetId: string) => void;
    widgetContent?: Record<string, React.ReactNode>;
}

export function WidgetGrid({
    widgets,
    layout,
    isEditMode,
    canEdit,
    selectedWidgetId,
    onLayoutChange,
    onSelectWidget,
    onToggleVisibility,
    onToggleLock,
    onTitleChange,
    onRemoveWidget,
    widgetContent = {},
}: WidgetGridProps) {
    const visibleWidgets = widgets.filter(w => w.visible);

    // Calculate grid dimensions based on container
    const [containerWidth, setContainerWidth] = React.useState(1200);
    const gridRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const updateWidth = () => {
            if (gridRef.current) {
                setContainerWidth(gridRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Cast to any to bypass type issues
    const GridComponent = ReactGridLayout as any;

    return (
        <div className="widget-grid" ref={gridRef}>
            {/* Grid Layout */}
            <GridComponent
                className="widget-grid__layout"
                layout={layout}
                cols={12}
                rowHeight={80}
                width={containerWidth}
                margin={[12, 12]}
                containerPadding={[0, 0]}
                isDraggable={isEditMode && canEdit}
                isResizable={isEditMode && canEdit}
                onLayoutChange={onLayoutChange}
                draggableHandle=".widget__drag-handle"
                useCSSTransforms={true}
                compactType="vertical"
            >
                {visibleWidgets.map(widget => (
                    <div key={widget.id}>
                        <Widget
                            config={widget}
                            isEditMode={isEditMode}
                            isSelected={selectedWidgetId === widget.id}
                            canEdit={canEdit}
                            onSelect={() => onSelectWidget(widget.id)}
                            onToggleVisibility={() => onToggleVisibility(widget.id)}
                            onToggleLock={() => onToggleLock(widget.id)}
                            onTitleChange={(newTitle) => onTitleChange(widget.id, newTitle)}
                            onRemove={() => onRemoveWidget(widget.id)}
                        >
                            {widgetContent[widget.id]}
                        </Widget>
                    </div>
                ))}
            </GridComponent>


        </div>
    );
}



