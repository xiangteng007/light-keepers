import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../design-system';
import { createReport } from '../api/services';
import type { ReportType, ReportSeverity } from '../api/services';
import './ReportPage.css';

// 前端災害類型對應後端 ReportType
const TYPE_MAPPING: Record<string, ReportType> = {
    earthquake: 'other',
    typhoon: 'other',
    flood: 'flood',
    fire: 'other',
    landslide: 'landslide',
    traffic: 'road_damage',
    infrastructure: 'building_damage',
    other: 'other',
};

// 災害類型選項
const DISASTER_TYPES = [
    { value: 'earthquake', label: '地震', icon: '🌍' },
    { value: 'typhoon', label: '颱風', icon: '🌀' },
    { value: 'flood', label: '水災', icon: '🌊' },
    { value: 'fire', label: '火災', icon: '🔥' },
    { value: 'landslide', label: '土石流', icon: '⛰️' },
    { value: 'traffic', label: '交通事故', icon: '🚗' },
    { value: 'infrastructure', label: '設施損壞', icon: '🏗️' },
    { value: 'other', label: '其他', icon: '❓' },
];

// 嚴重程度選項
const SEVERITY_LEVELS = [
    { value: 'low', label: '輕微', color: '#4CAF50' },
    { value: 'medium', label: '中等', color: '#FF9800' },
    { value: 'high', label: '嚴重', color: '#F44336' },
    { value: 'critical', label: '緊急', color: '#9C27B0' },
];

interface FormData {
    type: string;
    severity: string;
    title: string;
    description: string;
    latitude: number | null;
    longitude: number | null;
    address: string;
    contactName: string;
    contactPhone: string;
    photos: string[]; // 📷 圖片 URL 陣列
}

export default function ReportPage() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        type: '',
        severity: 'medium',
        title: '',
        description: '',
        latitude: null,
        longitude: null,
        address: '',
        contactName: '',
        contactPhone: '',
        photos: [], // 📷 照片陣列
    });

    // 自動獲取 GPS 位置
    const getLocation = () => {
        if (!navigator.geolocation) {
            setError('您的瀏覽器不支援 GPS 定位');
            return;
        }

        setIsLocating(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }));
                setIsLocating(false);
            },
            (err) => {
                setError(`定位失敗: ${err.message}`);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // 頁面載入時自動定位
    useEffect(() => {
        getLocation();
    }, []);

    // 表單欄位更新
    const updateField = (field: keyof FormData, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // 提交表單
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 驗證
        if (!formData.type) {
            setError('請選擇災害類型');
            return;
        }
        if (!formData.title.trim()) {
            setError('請輸入標題');
            return;
        }
        if (!formData.description.trim()) {
            setError('請輸入詳細描述');
            return;
        }
        if (!formData.latitude || !formData.longitude) {
            setError('請提供位置資訊');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 使用 API 服務提交回報
            await createReport({
                type: TYPE_MAPPING[formData.type] || 'other',
                severity: formData.severity as ReportSeverity,
                title: formData.title,
                description: formData.description,
                latitude: formData.latitude,
                longitude: formData.longitude,
                address: formData.address || undefined,
                photos: formData.photos.length > 0 ? formData.photos : undefined,
                contactName: formData.contactName || undefined,
                contactPhone: formData.contactPhone || undefined,
            });

            setSubmitSuccess(true);
        } catch (err) {
            console.error('Report submission error:', err);
            setError('提交失敗，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };


    // 成功畫面
    if (submitSuccess) {
        return (
            <div className="page report-page">
                <Card className="report-success" padding="lg">
                    <div className="report-success__icon">✅</div>
                    <h2>回報已提交</h2>
                    <p>感謝您的災情回報！我們將盡快審核處理。</p>
                    <div className="report-success__buttons">
                        <Button onClick={() => {
                            setSubmitSuccess(false);
                            setFormData({
                                type: '',
                                severity: 'medium',
                                title: '',
                                description: '',
                                latitude: formData.latitude,
                                longitude: formData.longitude,
                                address: '',
                                contactName: '',
                                contactPhone: '',
                                photos: [], // 重置照片
                            });
                        }}>
                            繼續回報
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/map')}>
                            查看地圖
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="page report-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📣 回報系統</h2>
                    <p className="page-subtitle">即時回報災情、需求或現場狀況</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card className="report-form" padding="lg">
                    {/* 錯誤訊息 */}
                    {error && (
                        <div className="report-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* 災害類型 */}
                    <div className="form-section">
                        <label className="form-label">災害類型 *</label>
                        <div className="disaster-type-grid">
                            {DISASTER_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    className={`disaster-type-btn ${formData.type === type.value ? 'active' : ''}`}
                                    onClick={() => updateField('type', type.value)}
                                >
                                    <span className="disaster-type-btn__icon">{type.icon}</span>
                                    <span className="disaster-type-btn__label">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 嚴重程度 */}
                    <div className="form-section">
                        <label className="form-label">嚴重程度</label>
                        <div className="severity-grid">
                            {SEVERITY_LEVELS.map(level => (
                                <button
                                    key={level.value}
                                    type="button"
                                    className={`severity-btn ${formData.severity === level.value ? 'active' : ''}`}
                                    style={{
                                        borderColor: formData.severity === level.value ? level.color : undefined,
                                        backgroundColor: formData.severity === level.value ? `${level.color}20` : undefined,
                                    }}
                                    onClick={() => updateField('severity', level.value)}
                                >
                                    <span
                                        className="severity-dot"
                                        style={{ backgroundColor: level.color }}
                                    />
                                    {level.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 標題 */}
                    <div className="form-section">
                        <label className="form-label">標題 *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="例如：中山路淹水約30公分"
                            value={formData.title}
                            onChange={(e) => updateField('title', e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    {/* 詳細描述 */}
                    <div className="form-section">
                        <label className="form-label">詳細描述 *</label>
                        <textarea
                            className="form-textarea"
                            placeholder="請描述災情的詳細狀況..."
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            rows={4}
                        />
                    </div>

                    {/* 📷 圖片上傳（選填） */}
                    <div className="form-section">
                        <label className="form-label">現場照片（選填，最多 5 張）</label>
                        <div className="photo-upload-section">
                            {/* 已選擇的圖片預覽 */}
                            <div className="photo-preview-grid">
                                {formData.photos.map((photo, index) => (
                                    <div key={index} className="photo-preview-item">
                                        <img src={photo} alt={`災情照片 ${index + 1}`} />
                                        <button
                                            type="button"
                                            className="photo-remove-btn"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    photos: prev.photos.filter((_, i) => i !== index)
                                                }));
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}

                                {/* 新增照片按鈕 */}
                                {formData.photos.length < 5 && (
                                    <label className="photo-add-btn">
                                        <span className="photo-add-icon">📷</span>
                                        <span>新增照片</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            hidden
                                            onChange={(e) => {
                                                const files = e.target.files;
                                                if (files) {
                                                    const remainingSlots = 5 - formData.photos.length;
                                                    const filesToProcess = Array.from(files).slice(0, remainingSlots);

                                                    filesToProcess.forEach((file) => {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                photos: [...prev.photos, reader.result as string].slice(0, 5)
                                                            }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    });
                                                }
                                                e.target.value = ''; // 重置 input
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
                            <p className="photo-hint">📌 照片可幫助審核人員更快了解災情狀況</p>
                        </div>
                    </div>

                    {/* 位置資訊 */}
                    <div className="form-section">
                        <label className="form-label">位置資訊 *</label>
                        <div className="location-section">
                            <div className="location-coords">
                                {formData.latitude && formData.longitude ? (
                                    <Badge variant="success" size="sm">
                                        📍 {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                                    </Badge>
                                ) : (
                                    <Badge variant="warning" size="sm">
                                        尚未定位
                                    </Badge>
                                )}
                                <button
                                    type="button"
                                    className="location-btn"
                                    onClick={getLocation}
                                    disabled={isLocating}
                                >
                                    {isLocating ? '定位中...' : '🔄 重新定位'}
                                </button>
                            </div>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="地址（可選）"
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 聯絡資訊 */}
                    <div className="form-section">
                        <label className="form-label">聯絡資訊（可選）</label>
                        <div className="contact-grid">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="姓名"
                                value={formData.contactName}
                                onChange={(e) => updateField('contactName', e.target.value)}
                            />
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="電話"
                                value={formData.contactPhone}
                                onChange={(e) => updateField('contactPhone', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 提交按鈕 */}
                    <Button
                        type="submit"
                        className="report-submit-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '提交中...' : '📤 提交回報'}
                    </Button>
                </Card>
            </form>
        </div>
    );
}
