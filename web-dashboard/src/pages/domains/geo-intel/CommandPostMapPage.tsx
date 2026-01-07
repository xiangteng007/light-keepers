import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMapRuntime, useOverlayEngine, useDrawingTools } from '../components/map';
import type { OverlayFeature, DrawingMode } from '../components/map';
import { CreateOverlayDialog } from '../components/overlays';
import type { CreateOverlayData, OverlayTypeForCreation } from '../components/overlays';
import { overlaysApi } from '../services/overlaysApi';
import type { OverlayDto, CreateOverlayDto } from '../services/overlaysApi';
import './CommandPostMapPage.css';

// Drawing modes (alias for DrawingMode)

// Convert API response to overlay feature
function toOverlayFeature(dto: OverlayDto): OverlayFeature {
    return {
        id: dto.id,
        type: dto.type,
        geometry: dto.geometry,
        properties: {
            name: dto.name,
            code: dto.code,
            state: dto.state,
            hazardType: dto.hazardType,
            severity: dto.severity,
            hazardStatus: dto.hazardStatus,
            confidence: dto.confidence,
            poiType: dto.poiType,
            capacity: dto.capacity,
            lockedBy: dto.lockedBy,
        },
    };
}

const CommandPostMapPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId?: string }>();
    const [overlays, setOverlays] = useState<OverlayFeature[]>([]);
    const [selectedOverlay, setSelectedOverlay] = useState<OverlayFeature | null>(null);
    const [activeTool, setActiveTool] = useState<DrawingMode>('select');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    // Dialog state for overlay creation
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Geometry | null>(null);
    const [pendingType, setPendingType] = useState<OverlayTypeForCreation>('aoi');

    // Initialize map
    const { map, isLoaded, error: mapError } = useMapRuntime({
        containerId: 'command-post-map',
        center: [121.0, 23.5],
        zoom: 8,
        onLoad: () => {
            console.log('Command Post map loaded');
        },
    });

    // Initialize overlay engine
    const { SEVERITY_COLORS, POI_ICONS } = useOverlayEngine({
        map,
        overlays,
        onSelect: setSelectedOverlay,
        showDrafts: true, // Command Post sees drafts
    });

    // Handle drawing completion
    const handleDrawingComplete = useCallback((geometry: GeoJSON.Geometry, type: 'aoi' | 'hazard' | 'poi') => {
        setPendingGeometry(geometry);
        setPendingType(type);
        setDialogOpen(true);
    }, []);

    // Initialize drawing tools
    const { isDrawing, vertexCount } = useDrawingTools({
        map,
        mode: activeTool,
        onComplete: handleDrawingComplete,
        onCancel: () => setActiveTool('select'),
    });

    // Load overlays
    const loadOverlays = useCallback(async (since?: string) => {
        if (!sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await overlaysApi.list(sessionId, { since });
            const features = data.map(toOverlayFeature);

            if (since) {
                // Merge incremental updates
                setOverlays(prev => {
                    const idMap = new Map(prev.map(o => [o.id, o]));
                    features.forEach(f => idMap.set(f.id, f));
                    return Array.from(idMap.values()).filter(
                        o => o.properties.state !== 'removed'
                    );
                });
            } else {
                setOverlays(features);
            }
        } catch (err: any) {
            setError(err.message || '無法載入覆蓋層資�?);
            console.error('Failed to load overlays:', err);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    // Handle overlay creation from dialog
    const handleCreateOverlay = useCallback(async (data: CreateOverlayData) => {
        if (!sessionId) return;

        setIsLoading(true);
        setDialogOpen(false);

        try {
            const dto: CreateOverlayDto = {
                type: data.type,
                name: data.name,
                code: data.code,
                geometry: data.geometry,
                hazardType: data.hazardType,
                severity: data.severity,
                poiType: data.poiType,
                capacity: data.capacity,
            };
            await overlaysApi.create(sessionId, dto);
            await loadOverlays();
            setActiveTool('select');
        } catch (err: any) {
            setError(err.message || '建立失敗');
        } finally {
            setIsLoading(false);
            setPendingGeometry(null);
        }
    }, [sessionId, loadOverlays]);

    // Initial load
    useEffect(() => {
        if (sessionId && isLoaded) {
            loadOverlays();
        }
    }, [sessionId, isLoaded, loadOverlays]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape - deselect
            if (e.key === 'Escape') {
                setSelectedOverlay(null);
                setActiveTool('select');
            }
            // Number keys for tools
            if (e.key === '1') setActiveTool('select');
            if (e.key === '2') setActiveTool('pan');
            if (e.key === '3') setActiveTool('aoi_polygon');
            if (e.key === '4') setActiveTool('hazard_polygon');
            if (e.key === '5') setActiveTool('poi');
            // Delete selected
            if (e.key === 'Delete' && selectedOverlay) {
                handleDeleteOverlay(selectedOverlay.id);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedOverlay]);

    // Handle overlay actions
    const handlePublishOverlay = async (overlayId: string) => {
        if (!sessionId) return;
        try {
            await overlaysApi.publish(sessionId, overlayId);
            loadOverlays();
        } catch (err: any) {
            setError(err.message || '發布失敗');
        }
    };

    const handleDeleteOverlay = async (overlayId: string) => {
        if (!sessionId) return;
        if (!confirm('確定要刪除此物件�?)) return;
        try {
            await overlaysApi.delete(sessionId, overlayId);
            setSelectedOverlay(null);
            loadOverlays();
        } catch (err: any) {
            setError(err.message || '刪除失敗');
        }
    };

    // Render toolbar
    const renderToolbar = () => (
        <div className="cpm-toolbar">
            <div className="cpm-toolbar-group">
                <button
                    className={`cpm-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
                    onClick={() => setActiveTool('select')}
                    title="選擇 (1)"
                >
                    �?
                </button>
                <button
                    className={`cpm-tool-btn ${activeTool === 'pan' ? 'active' : ''}`}
                    onClick={() => setActiveTool('pan')}
                    title="平移 (2)"
                >
                    �?
                </button>
            </div>
            <div className="cpm-toolbar-divider" />
            <div className="cpm-toolbar-group">
                <button
                    className={`cpm-tool-btn ${activeTool === 'aoi_polygon' ? 'active' : ''}`}
                    onClick={() => setActiveTool('aoi_polygon')}
                    title="繪製 AOI (3)"
                >
                    �?
                </button>
                <button
                    className={`cpm-tool-btn ${activeTool === 'hazard_polygon' ? 'active' : ''}`}
                    onClick={() => setActiveTool('hazard_polygon')}
                    title="繪製危險區 (4)"
                >
                    ⚠️
                </button>
                <button
                    className={`cpm-tool-btn ${activeTool === 'poi' ? 'active' : ''}`}
                    onClick={() => setActiveTool('poi')}
                    title="新增 POI (5)"
                >
                    📍
                </button>
            </div>
            <div className="cpm-toolbar-spacer" />
            <div className="cpm-toolbar-group">
                <button
                    className="cpm-tool-btn"
                    onClick={() => loadOverlays()}
                    title="重新載入"
                >
                    🔄
                </button>
            </div>
        </div>
    );

    // Render left panel (object list)
    const renderLeftPanel = () => (
        <div className={`cpm-panel cpm-panel-left ${leftPanelOpen ? 'open' : 'closed'}`}>
            <div className="cpm-panel-header">
                <h3>物件列表</h3>
                <button
                    className="cpm-panel-toggle"
                    onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                >
                    {leftPanelOpen ? '◀' : '�?}
                </button>
            </div>
            {leftPanelOpen && (
                <div className="cpm-panel-content">
                    {overlays.length === 0 ? (
                        <div className="cpm-empty">尚無覆蓋層物�?/div>
                    ) : (
                        <ul className="cpm-overlay-list">
                            {overlays.map((overlay) => (
                                <li
                                    key={overlay.id}
                                    className={`cpm-overlay-item ${selectedOverlay?.id === overlay.id ? 'selected' : ''} ${overlay.properties.state}`}
                                    onClick={() => setSelectedOverlay(overlay)}
                                >
                                    <span className="cpm-overlay-icon">
                                        {overlay.type === 'poi' && POI_ICONS[overlay.properties.poiType || ''] || '📍'}
                                        {overlay.type === 'aoi' && '�?}
                                        {overlay.type === 'hazard' && '⚠️'}
                                    </span>
                                    <span className="cpm-overlay-name">
                                        {overlay.properties.name || overlay.properties.code || overlay.id.slice(0, 8)}
                                    </span>
                                    <span className={`cpm-overlay-state ${overlay.properties.state}`}>
                                        {overlay.properties.state === 'draft' && '草稿'}
                                        {overlay.properties.state === 'published' && '已發�?}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );

    // Render right panel (property editor)
    const renderRightPanel = () => (
        <div className={`cpm-panel cpm-panel-right ${rightPanelOpen ? 'open' : 'closed'}`}>
            <div className="cpm-panel-header">
                <button
                    className="cpm-panel-toggle"
                    onClick={() => setRightPanelOpen(!rightPanelOpen)}
                >
                    {rightPanelOpen ? '�? : '◀'}
                </button>
                <h3>屬性編�?/h3>
            </div>
            {rightPanelOpen && (
                <div className="cpm-panel-content">
                    {selectedOverlay ? (
                        <div className="cpm-property-editor">
                            <div className="cpm-property-group">
                                <label>類型</label>
                                <span className="cpm-property-value">{selectedOverlay.type.toUpperCase()}</span>
                            </div>
                            <div className="cpm-property-group">
                                <label>名稱</label>
                                <input
                                    type="text"
                                    value={selectedOverlay.properties.name || ''}
                                    readOnly
                                    className="cpm-property-input"
                                />
                            </div>
                            {selectedOverlay.type === 'hazard' && (
                                <>
                                    <div className="cpm-property-group">
                                        <label>危險類型</label>
                                        <span className="cpm-property-value">{selectedOverlay.properties.hazardType}</span>
                                    </div>
                                    <div className="cpm-property-group">
                                        <label>嚴重程度</label>
                                        <span
                                            className="cpm-severity-badge"
                                            style={{ backgroundColor: SEVERITY_COLORS[selectedOverlay.properties.severity || 0] }}
                                        >
                                            Level {selectedOverlay.properties.severity}
                                        </span>
                                    </div>
                                </>
                            )}
                            {selectedOverlay.type === 'poi' && (
                                <>
                                    <div className="cpm-property-group">
                                        <label>POI 類型</label>
                                        <span className="cpm-property-value">{selectedOverlay.properties.poiType}</span>
                                    </div>
                                    {selectedOverlay.properties.capacity && (
                                        <div className="cpm-property-group">
                                            <label>容量</label>
                                            <span className="cpm-property-value">{selectedOverlay.properties.capacity}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="cpm-property-actions">
                                {selectedOverlay.properties.state === 'draft' && (
                                    <button
                                        className="cpm-btn cpm-btn-primary"
                                        onClick={() => handlePublishOverlay(selectedOverlay.id)}
                                    >
                                        發布
                                    </button>
                                )}
                                <button
                                    className="cpm-btn cpm-btn-danger"
                                    onClick={() => handleDeleteOverlay(selectedOverlay.id)}
                                >
                                    刪除
                                </button>
                            </div>
                            {selectedOverlay.properties.lockedBy && (
                                <div className="cpm-lock-info">
                                    🔒 已被 {selectedOverlay.properties.lockedBy} 鎖定
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="cpm-empty">請選擇一個物件以編輯屬�?/div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="command-post-map-page">
            {renderToolbar()}
            <div className="cpm-main">
                {renderLeftPanel()}
                <div className="cpm-map-container">
                    <div id="command-post-map" className="cpm-map" />
                    {mapError && (
                        <div className="cpm-map-error">
                            地圖載入錯誤: {mapError}
                        </div>
                    )}
                    {isLoading && (
                        <div className="cpm-loading">
                            載入�?..
                        </div>
                    )}
                    {error && (
                        <div className="cpm-error-banner">
                            {error}
                            <button onClick={() => setError(null)}>�?/button>
                        </div>
                    )}
                </div>
                {renderRightPanel()}
            </div>
            <div className="cpm-status-bar">
                <span>任務 ID: {sessionId || '(未選�?'}</span>
                <span>物件�? {overlays.length}</span>
                <span>工具: {activeTool}</span>
                {isDrawing && <span>頂點�? {vertexCount}</span>}
            </div>

            {/* Create Overlay Dialog */}
            <CreateOverlayDialog
                isOpen={dialogOpen}
                type={pendingType}
                geometry={pendingGeometry}
                onConfirm={handleCreateOverlay}
                onCancel={() => {
                    setDialogOpen(false);
                    setPendingGeometry(null);
                    setActiveTool('select');
                }}
            />
        </div>
    );
};

export default CommandPostMapPage;
