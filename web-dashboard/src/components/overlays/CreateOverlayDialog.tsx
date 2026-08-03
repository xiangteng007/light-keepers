import React, { useState } from 'react';
import { CloseIcon, LocationIcon, LayersIcon, MinusIcon } from '../../design-system/icons';
import './CreateOverlayDialog.css';

export type OverlayTypeForCreation = 'aoi' | 'hazard' | 'poi';

// Hazard types
const HAZARD_TYPES = [
    { value: 'flood', label: '淹水區域' },
    { value: 'landslide', label: '土石流' },
    { value: 'fire', label: '火災' },
    { value: 'chemical', label: '化學災害' },
    { value: 'building_collapse', label: '建物倒塌' },
    { value: 'traffic', label: '交通事故' },
    { value: 'other', label: '其他' },
];

// POI types
const POI_TYPES = [
    { value: 'shelter', label: '避難收容所' },
    { value: 'rally_point', label: '集合點' },
    { value: 'supply', label: '物資發放點' },
    { value: 'command_post', label: '指揮中心' },
    { value: 'medical', label: '醫療站' },
    { value: 'other', label: '其他' },
];

// Severity levels
const SEVERITY_LEVELS = [
    { value: 1, label: '1 - 低', color: '#22C55E' },
    { value: 2, label: '2 - 中等', color: '#EAB308' },
    { value: 3, label: '3 - 高', color: '#F97316' },
    { value: 4, label: '4 - 嚴重', color: '#EF4444' },
];

interface CreateOverlayDialogProps {
    isOpen: boolean;
    type: OverlayTypeForCreation;
    geometry: GeoJSON.Geometry | null;
    onConfirm: (data: CreateOverlayData) => void;
    onCancel: () => void;
}

export interface CreateOverlayData {
    type: OverlayTypeForCreation;
    name: string;
    code?: string;
    geometry: GeoJSON.Geometry;
    hazardType?: string;
    severity?: number;
    poiType?: string;
    capacity?: number;
    props?: Record<string, any>;
}

export const CreateOverlayDialog: React.FC<CreateOverlayDialogProps> = ({
    isOpen,
    type,
    geometry,
    onConfirm,
    onCancel,
}) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [hazardType, setHazardType] = useState(HAZARD_TYPES[0].value);
    const [severity, setSeverity] = useState(2);
    const [poiType, setPoiType] = useState(POI_TYPES[0].value);
    const [capacity, setCapacity] = useState<number | ''>('');

    if (!isOpen || !geometry) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const data: CreateOverlayData = {
            type,
            name: name || getDefaultName(),
            code: code || undefined,
            geometry,
        };

        if (type === 'hazard') {
            data.hazardType = hazardType;
            data.severity = severity;
        }

        if (type === 'poi') {
            data.poiType = poiType;
            if (capacity !== '') {
                data.capacity = Number(capacity);
            }
        }

        onConfirm(data);
        resetForm();
    };

    const getDefaultName = () => {
        const timestamp = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        switch (type) {
            case 'aoi':
                return `AOI-${timestamp}`;
            case 'hazard':
                return `${HAZARD_TYPES.find(h => h.value === hazardType)?.label}-${timestamp}`;
            case 'poi':
                return `${POI_TYPES.find(p => p.value === poiType)?.label}-${timestamp}`;
            default:
                return `Overlay-${timestamp}`;
        }
    };

    const resetForm = () => {
        setName('');
        setCode('');
        setHazardType(HAZARD_TYPES[0].value);
        setSeverity(2);
        setPoiType(POI_TYPES[0].value);
        setCapacity('');
    };

    const handleCancel = () => {
        resetForm();
        onCancel();
    };

    const getTitle = () => {
        switch (type) {
            case 'aoi':
                return '新增 AOI 區域';
            case 'hazard':
                return '新增危險區域';
            case 'poi':
                return '新增 POI 點位';
            default:
                return '新增覆蓋層';
        }
    };

    return (
        <div className="cod-overlay">
            <div className="cod-dialog">
                <div className="cod-header">
                    <h2 className="cod-title">{getTitle()}</h2>
                    <button className="cod-close" onClick={handleCancel} title="取消">
                        <CloseIcon size={16} aria-hidden="true" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="cod-body">
                        {/* Common fields */}
                        <div className="cod-field">
                            <label className="cod-label">名稱</label>
                            <input
                                type="text"
                                className="cod-input"
                                placeholder={getDefaultName()}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="cod-field">
                            <label className="cod-label">代碼（選填）</label>
                            <input
                                type="text"
                                className="cod-input"
                                placeholder="例：A-001"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </div>

                        {/* Hazard-specific fields */}
                        {type === 'hazard' && (
                            <>
                                <div className="cod-field">
                                    <label className="cod-label">危險類型</label>
                                    <select
                                        className="cod-select"
                                        value={hazardType}
                                        onChange={(e) => setHazardType(e.target.value)}
                                    >
                                        {HAZARD_TYPES.map((ht) => (
                                            <option key={ht.value} value={ht.value}>
                                                {ht.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="cod-field">
                                    <label className="cod-label">嚴重程度</label>
                                    <div className="cod-severity-options">
                                        {SEVERITY_LEVELS.map((level) => (
                                            <button
                                                key={level.value}
                                                type="button"
                                                className={`cod-severity-btn ${severity === level.value ? 'active' : ''}`}
                                                style={{
                                                    '--severity-color': level.color,
                                                } as React.CSSProperties}
                                                onClick={() => setSeverity(level.value)}
                                            >
                                                {level.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* POI-specific fields */}
                        {type === 'poi' && (
                            <>
                                <div className="cod-field">
                                    <label className="cod-label">POI 類型</label>
                                    <select
                                        className="cod-select"
                                        value={poiType}
                                        onChange={(e) => setPoiType(e.target.value)}
                                    >
                                        {POI_TYPES.map((pt) => (
                                            <option key={pt.value} value={pt.value}>
                                                {pt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="cod-field">
                                    <label className="cod-label">容量（選填）</label>
                                    <input
                                        type="number"
                                        className="cod-input"
                                        placeholder="例：100"
                                        min="0"
                                        value={capacity}
                                        onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : '')}
                                    />
                                </div>
                            </>
                        )}

                        {/* Geometry info */}
                        <div className="cod-field cod-field--info">
                            <label className="cod-label">幾何資訊</label>
                            <div className="cod-geometry-info">
                                <span className="cod-geometry-type">
                                    {geometry.type === 'Point' && <><LocationIcon size={16} aria-hidden="true" /> 點位</>}
                                    {geometry.type === 'Polygon' && <><LayersIcon size={16} aria-hidden="true" /> 多邊形</>}
                                    {geometry.type === 'LineString' && <><MinusIcon size={16} aria-hidden="true" /> 線段</>}
                                </span>
                                {geometry.type === 'Polygon' && (
                                    <span className="cod-geometry-detail">
                                        {(geometry as GeoJSON.Polygon).coordinates[0].length - 1} 個頂點
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="cod-footer">
                        <button type="button" className="cod-btn cod-btn--secondary" onClick={handleCancel}>
                            取消
                        </button>
                        <button type="submit" className="cod-btn cod-btn--primary">
                            建立
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateOverlayDialog;
