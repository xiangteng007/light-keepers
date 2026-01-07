import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../design-system';
import { createReport } from '../api/services';
import type { ReportType, ReportSeverity } from '../api/services';
import './ReportPage.css';

// 步驟定義
type WizardStep = 'type' | 'details' | 'location' | 'confirm';

const STEPS: { key: WizardStep; label: string; icon: string }[] = [
    { key: 'type', label: '災害類型', icon: '1' },
    { key: 'details', label: '描述與照�?, icon: '2' },
    { key: 'location', label: '位置確認', icon: '3' },
    { key: 'confirm', label: '確認送出', icon: '4' },
];

// 前端災害類型對應後端 ReportType
const TYPE_MAPPING: Record<string, ReportType> = {
    earthquake: 'earthquake',
    typhoon: 'typhoon',
    flood: 'flood',
    fire: 'fire',
    landslide: 'landslide',
    traffic: 'traffic',
    infrastructure: 'infrastructure',
    other: 'other',
};

// 災害類型選項
const DISASTER_TYPES = [
    { value: 'earthquake', label: '地震', icon: '🌍', description: '地震造成的損�? },
    { value: 'typhoon', label: '颱風', icon: '🌀', description: '颱風、強風災�? },
    { value: 'flood', label: '水災', icon: '🌊', description: '淹水、積水情�? },
    { value: 'fire', label: '火災', icon: '🔥', description: '火災、濃�? },
    { value: 'landslide', label: '土石�?, icon: '⛰️', description: '山崩、土石滑�? },
    { value: 'traffic', label: '交通事�?, icon: '🚗', description: '車禍、道路阻�? },
    { value: 'infrastructure', label: '設施損壞', icon: '🏗�?, description: '建築、設施損毀' },
    { value: 'other', label: '其他', icon: '�?, description: '其他緊急狀�? },
];

// 嚴重程度選項
const SEVERITY_LEVELS = [
    { value: 'low', label: '輕微', color: '#4CAF50', description: '無立即危�? },
    { value: 'medium', label: '中等', color: '#FF9800', description: '需要關�? },
    { value: 'high', label: '嚴重', color: '#F44336', description: '需要協�? },
    { value: 'critical', label: '緊�?, color: '#9C27B0', description: '立即危險' },
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
    photos: string[];
}

export default function ReportPage() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<WizardStep>('type');
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
        photos: [],
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

    // 當進入位置步驟時自動定�?
    useEffect(() => {
        if (currentStep === 'location' && !formData.latitude) {
            getLocation();
        }
    }, [currentStep]);

    // 表單欄位更新
    const updateField = (field: keyof FormData, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // 計算當前步驟索引
    const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

    // 驗證當前步驟
    const validateStep = (): boolean => {
        setError(null);
        switch (currentStep) {
            case 'type':
                if (!formData.type) {
                    setError('請選擇災害類�?);
                    return false;
                }
                return true;
            case 'details':
                if (!formData.title.trim()) {
                    setError('請輸入標�?);
                    return false;
                }
                if (!formData.description.trim()) {
                    setError('請輸入詳細描�?);
                    return false;
                }
                return true;
            case 'location':
                if (!formData.latitude || !formData.longitude) {
                    setError('請提供位置資�?);
                    return false;
                }
                return true;
            case 'confirm':
                return true;
            default:
                return true;
        }
    };

    // 下一�?
    const nextStep = () => {
        if (!validateStep()) return;
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEPS.length) {
            setCurrentStep(STEPS[nextIndex].key);
        }
    };

    // 上一�?
    const prevStep = () => {
        setError(null);
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(STEPS[prevIndex].key);
        }
    };

    // 提交表單
    const handleSubmit = async () => {
        if (!validateStep()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await createReport({
                type: TYPE_MAPPING[formData.type] || 'other',
                severity: formData.severity as ReportSeverity,
                title: formData.title,
                description: formData.description,
                latitude: formData.latitude!,
                longitude: formData.longitude!,
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

    // 重置表單
    const resetForm = () => {
        setSubmitSuccess(false);
        setCurrentStep('type');
        setFormData({
            type: '',
            severity: 'medium',
            title: '',
            description: '',
            latitude: null,
            longitude: null,
            address: '',
            contactName: '',
            contactPhone: '',
            photos: [],
        });
    };

    // 成功畫面
    if (submitSuccess) {
        return (
            <div className="page report-page">
                <Card className="report-success" padding="lg">
                    <div className="report-success__icon">�?/div>
                    <h2>回報已提�?/h2>
                    <p>感謝您的災情回報！我們將盡快審核處理�?/p>
                    <div className="report-success__buttons">
                        <Button onClick={resetForm}>
                            繼續回報
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/events')}>
                            查看所有事�?
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // 渲染當前步驟內容
    const renderStepContent = () => {
        switch (currentStep) {
            case 'type':
                return (
                    <div className="wizard-step wizard-step--type">
                        <h3 className="wizard-step__title">選擇災害類型</h3>
                        <p className="wizard-step__subtitle">請選擇最符合的災害類�?/p>

                        <div className="disaster-type-grid">
                            {DISASTER_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    className={`disaster-type-card ${formData.type === type.value ? 'active' : ''}`}
                                    onClick={() => updateField('type', type.value)}
                                >
                                    <span className="disaster-type-card__icon">{type.icon}</span>
                                    <span className="disaster-type-card__label">{type.label}</span>
                                    <span className="disaster-type-card__desc">{type.description}</span>
                                </button>
                            ))}
                        </div>

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
                                        <span className="severity-label">{level.label}</span>
                                        <span className="severity-desc">{level.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'details':
                return (
                    <div className="wizard-step wizard-step--details">
                        <h3 className="wizard-step__title">描述與照�?/h3>
                        <p className="wizard-step__subtitle">請提供災情的詳細資訊</p>

                        <div className="form-section">
                            <label className="form-label">標題 *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例如：中山路淹水�?0公分"
                                value={formData.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                maxLength={200}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">詳細描述 *</label>
                            <textarea
                                className="form-textarea"
                                placeholder="請描述災情的詳細狀況，包括時間、範圍、影響程度等..."
                                value={formData.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                rows={5}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">現場照片（選填，最�?5 張）</label>
                            <div className="photo-upload-section">
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
                                                �?
                                            </button>
                                        </div>
                                    ))}

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
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="photo-hint">📌 照片可幫助審核人員更快了解災情狀�?/p>
                            </div>
                        </div>
                    </div>
                );

            case 'location':
                return (
                    <div className="wizard-step wizard-step--location">
                        <h3 className="wizard-step__title">位置確認</h3>
                        <p className="wizard-step__subtitle">請確認災情發生位�?/p>

                        <div className="location-status-card">
                            {formData.latitude && formData.longitude ? (
                                <>
                                    <div className="location-status-icon success">📍</div>
                                    <div className="location-status-info">
                                        <span className="location-status-label">已取得位�?/span>
                                        <span className="location-status-coords">
                                            {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="location-status-icon warning">⚠️</div>
                                    <div className="location-status-info">
                                        <span className="location-status-label">尚未定位</span>
                                        <span className="location-status-hint">點擊下方按鈕取得位置</span>
                                    </div>
                                </>
                            )}
                            <button
                                type="button"
                                className="location-refresh-btn"
                                onClick={getLocation}
                                disabled={isLocating}
                            >
                                {isLocating ? '定位�?..' : '🔄 重新定位'}
                            </button>
                        </div>

                        <div className="form-section">
                            <label className="form-label">地址（選填）</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="輸入詳細地址以便協助定位"
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                            />
                        </div>

                        <div className="location-map-placeholder">
                            <span className="location-map-icon">🗺�?/span>
                            <span>地圖預覽即將推出</span>
                        </div>
                    </div>
                );

            case 'confirm':
                const selectedType = DISASTER_TYPES.find(t => t.value === formData.type);
                const selectedSeverity = SEVERITY_LEVELS.find(s => s.value === formData.severity);

                return (
                    <div className="wizard-step wizard-step--confirm">
                        <h3 className="wizard-step__title">確認資訊</h3>
                        <p className="wizard-step__subtitle">請確認以下資訊後送出</p>

                        <div className="confirm-summary">
                            <div className="confirm-item">
                                <span className="confirm-label">災害類型</span>
                                <span className="confirm-value">
                                    {selectedType?.icon} {selectedType?.label}
                                </span>
                            </div>
                            <div className="confirm-item">
                                <span className="confirm-label">嚴重程度</span>
                                <span
                                    className="severity-badge"
                                    style={{ backgroundColor: `${selectedSeverity?.color}20`, color: selectedSeverity?.color }}
                                >
                                    {selectedSeverity?.label}
                                </span>
                            </div>
                            <div className="confirm-item">
                                <span className="confirm-label">標題</span>
                                <span className="confirm-value">{formData.title}</span>
                            </div>
                            <div className="confirm-item confirm-item--full">
                                <span className="confirm-label">描述</span>
                                <p className="confirm-description">{formData.description}</p>
                            </div>
                            <div className="confirm-item">
                                <span className="confirm-label">位置</span>
                                <span className="confirm-value">
                                    📍 {formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}
                                    {formData.address && ` (${formData.address})`}
                                </span>
                            </div>
                            {formData.photos.length > 0 && (
                                <div className="confirm-item confirm-item--full">
                                    <span className="confirm-label">照片 ({formData.photos.length}�?</span>
                                    <div className="confirm-photos">
                                        {formData.photos.map((photo, i) => (
                                            <img key={i} src={photo} alt={`照片${i + 1}`} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="contact-section">
                            <h4>聯絡資訊（選填）</h4>
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
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="page report-page report-page--wizard">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📣 災情回報</h2>
                    <p className="page-subtitle">步驟 {currentStepIndex + 1}/{STEPS.length}</p>
                </div>
            </div>

            {/* 步驟指示�?*/}
            <div className="wizard-progress">
                {STEPS.map((step, index) => (
                    <div
                        key={step.key}
                        className={`wizard-progress__step ${index < currentStepIndex ? 'completed' :
                            index === currentStepIndex ? 'active' : ''
                            }`}
                    >
                        <div className="wizard-progress__circle">
                            {index < currentStepIndex ? '�? : step.icon}
                        </div>
                        <span className="wizard-progress__label">{step.label}</span>
                        {index < STEPS.length - 1 && <div className="wizard-progress__line" />}
                    </div>
                ))}
            </div>

            <Card className="wizard-content" padding="lg">
                {/* 錯誤訊息 */}
                {error && (
                    <div className="report-error">
                        ⚠️ {error}
                    </div>
                )}

                {/* 步驟內容 */}
                {renderStepContent()}

                {/* 導航按鈕 */}
                <div className="wizard-navigation">
                    {currentStepIndex > 0 && (
                        <Button
                            variant="secondary"
                            onClick={prevStep}
                        >
                            �?上一�?
                        </Button>
                    )}
                    <div className="wizard-navigation__spacer" />
                    {currentStepIndex < STEPS.length - 1 ? (
                        <Button onClick={nextStep}>
                            下一�?�?
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '提交�?..' : '📤 送出回報'}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
