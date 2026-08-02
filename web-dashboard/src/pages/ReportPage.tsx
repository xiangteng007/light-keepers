/**
 * ReportPage（/intake 通報）— R5 B3c 野戰手冊化（c4 構圖）
 *
 * 視覺依據：public/design-mockups/r5-b3c-deep.html <section class="c4">
 * （owner 核准的「手機 30 秒通報」目標構圖）＋ DESIGN_LANGUAGE.md v2：
 * - 三段進度規線（當前段橄欖實心、已完成卡其實心＋✓ 形狀雙編碼）
 * - 「發生了什麼？」大標＋橄欖短規線＋ STEP 拉丁 stencil 小標
 * - 災型大格：卡其 2px 描邊、選中橄欖實心底深字＋右上折角（不依賴透明度）
 * - 拇指區底欄：已選摘要（SELECTED ＋ mono 格號）＋ 58px 大按鈕「下一步」
 * - 數字/編號一律 mono＋tabular-nums；中文字距 0；本步驟無生命危險語義，
 *   紅色全程未動用（表單錯誤改琥珀，v2 §D 紅色憲法）
 *
 * 功能依據（R2b，全數保留）：docs/architecture/DESIGN_LANGUAGE.md
 * - 「30 秒完成通報」：4 步精簡為 3 步（災型 → 現場 → 送出）。
 *   必填只剩「災型 + 定位」；標題/描述可留空（送出時以災型 SSOT 自動補
 *   「○○災情通報」——高壓可用性 > 完整資料，§0 原則 1）。
 * - 拍照/定位/語音優先於打字：進入「現場」步驟自動定位；照片與語音輸入
 *   排在文字欄位之前；支援 Web Speech API 的環境提供語音轉文字。
 * - 離線可用性明示：離線時顯示常駐提示；送出改走 offlineService 的
 *   intake outbox（3.4 已就緒），成功畫面明確區分「已送出」與
 *   「已暫存，恢復連線自動送出」。
 * - 行動端優先：主要動作固定在下半屏（sticky 底欄），觸控目標 ≥44px。
 *
 * C1.1（CD-1）保留清單——不得移除：
 * - 災型選單依 DISASTER_TYPE_GROUPS 分組（天災／民防），lucide 圖標
 * - 大量傷患（MCI）跨災型旗標 + 概估人數（isMassCasualty / casualtyEstimate）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Camera, ChevronLeft, ChevronRight, CloudOff, LocateFixed,
    MapPin, Mic, Send, X,
} from 'lucide-react';
import { Card, Button, Badge } from '../design-system';
import {
    DISASTER_TYPE_GROUPS,
    DISASTER_TYPE_OPTIONS,
    MASS_CASUALTY_META,
    getDisasterTypeMeta,
} from '../constants/disasterTypes';
import { createReport } from '../api/services';
import type { ReportType, ReportSeverity } from '../api/services';
import { offlineService } from '../services/offline/offline.service';
import './ReportPage.css';

// ===== 步驟定義（30 秒流：3 步） =====

type WizardStep = 'type' | 'scene' | 'confirm';

const STEPS: {
    key: WizardStep;
    /** 進度規線下的中文段名（中文字距 0） */
    label: string;
    /** STEP 拉丁 stencil 小標（c4：STEP 01 · INCIDENT TYPE） */
    caption: string;
    /** 各步大標（c4「發生了什麼？」語言） */
    title: string;
    /** 大標下的一行提示 */
    hint: string;
}[] = [
    {
        key: 'type',
        label: '災型',
        caption: 'INCIDENT TYPE',
        title: '發生了什麼？',
        hint: '點選最符合的災型，三十秒內完成通報。',
    },
    {
        key: 'scene',
        label: '現場',
        caption: 'ON SCENE',
        title: '現場狀況',
        hint: '定位自動取得；拍照與語音優先，文字可留空。',
    },
    {
        key: 'confirm',
        label: '送出',
        caption: 'CONFIRM',
        title: '確認送出',
        hint: '核對重點後送出；離線也會安全暫存，不會遺失。',
    },
];

/** c4 構圖的災型格號：依 SSOT 選單順序跨分組連號（01 起），一律 mono 呈現 */
function disasterOrdinal(value: string): string {
    return String(DISASTER_TYPE_OPTIONS.findIndex(o => o.value === value) + 1).padStart(2, '0');
}

// 嚴重程度：語意對照 DESIGN_LANGUAGE §3（low=安全綠、medium=警戒橙、
// high=危急紅、critical=大規模危機紫），顏色由 CSS 語義 token 提供，
// 頁面不再持有 hex。
const SEVERITY_LEVELS: { value: ReportSeverity; label: string; description: string }[] = [
    { value: 'low', label: '輕微', description: '無立即危險' },
    { value: 'medium', label: '中等', description: '需要關注' },
    { value: 'high', label: '嚴重', description: '需要協助' },
    { value: 'critical', label: '緊急', description: '立即危險' },
];

const MAX_PHOTOS = 5;

interface FormData {
    type: ReportType | '';
    severity: ReportSeverity;
    title: string;
    description: string;
    latitude: number | null;
    longitude: number | null;
    address: string;
    contactName: string;
    contactPhone: string;
    photos: string[];
    // C1.1: 大量傷患跨災型旗標
    isMassCasualty: boolean;
    casualtyEstimate: string;
}

const EMPTY_FORM: FormData = {
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
    isMassCasualty: false,
    casualtyEstimate: '',
};

// ===== 語音輸入（漸進增強：不支援時不顯示按鈕） =====

type SpeechRecognitionLike = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
    const w = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 判斷是否為「沒有拿到任何回應」的網路層錯誤（此時走離線暫存而非報錯） */
function isNetworkError(err: unknown): boolean {
    return !!err && typeof err === 'object' && !('response' in err && (err as { response?: unknown }).response);
}

export default function ReportPage() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<WizardStep>('type');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    /** null=未送出；'sent'=已送達伺服器；'queued'=已暫存於離線 outbox */
    const [submitResult, setSubmitResult] = useState<'sent' | 'queued' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

    // ===== 離線狀態（明示於 UI） =====
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // ===== 定位 =====
    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('您的裝置不支援 GPS 定位');
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
                setError(`定位失敗：${err.message}`);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }, []);

    // 進入「現場」步驟時自動定位（定位優先於打字）
    useEffect(() => {
        if (currentStep === 'scene' && formData.latitude === null && !isLocating) {
            getLocation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep]);

    // ===== 語音輸入（描述欄） =====
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const speechSupported = getSpeechRecognition() !== null;

    const toggleVoiceInput = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }
        const Ctor = getSpeechRecognition();
        if (!Ctor) return;
        const recognition = new Ctor();
        recognition.lang = 'zh-TW';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            const chunks: string[] = [];
            for (let i = 0; i < event.results.length; i++) {
                chunks.push(event.results[i][0]?.transcript ?? '');
            }
            const transcript = chunks.join('');
            if (transcript) {
                setFormData(prev => ({
                    ...prev,
                    description: prev.description ? `${prev.description}${transcript}` : transcript,
                }));
            }
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognitionRef.current = recognition;
        setIsListening(true);
        recognition.start();
    };

    useEffect(() => () => recognitionRef.current?.stop(), []);

    // ===== 表單 =====
    const updateField = (field: keyof FormData, value: FormData[keyof FormData]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
    const selectedMeta = formData.type ? getDisasterTypeMeta(formData.type) : null;

    const validateStep = (): boolean => {
        setError(null);
        if (currentStep === 'type' && !formData.type) {
            setError('請選擇災害類型');
            return false;
        }
        if (currentStep === 'scene' && (formData.latitude === null || formData.longitude === null)) {
            setError('尚未取得定位——請按「重新定位」或允許定位權限');
            return false;
        }
        return true;
    };

    const nextStep = () => {
        if (!validateStep()) return;
        const next = STEPS[currentStepIndex + 1];
        if (next) setCurrentStep(next.key);
    };

    const prevStep = () => {
        setError(null);
        const prev = STEPS[currentStepIndex - 1];
        if (prev) setCurrentStep(prev.key);
    };

    // ===== 照片 =====
    const addPhotos = (files: FileList | null) => {
        if (!files) return;
        const remaining = MAX_PHOTOS - formData.photos.length;
        Array.from(files).slice(0, remaining).forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    photos: [...prev.photos, reader.result as string].slice(0, MAX_PHOTOS),
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    };

    // ===== 送出 =====
    const handleSubmit = async () => {
        if (!validateStep()) return;
        if (!formData.type || formData.latitude === null || formData.longitude === null) return;

        // 30 秒流：標題/描述可留空——以災型自動補（高壓可用性 > 完整資料）
        const meta = getDisasterTypeMeta(formData.type);
        const title = formData.title.trim() || `${meta.label}災情通報`;
        const description = formData.description.trim() || title;

        const payload = {
            type: formData.type as ReportType,
            severity: formData.severity,
            title,
            description,
            latitude: formData.latitude,
            longitude: formData.longitude,
            address: formData.address || undefined,
            photos: formData.photos.length > 0 ? formData.photos : undefined,
            contactName: formData.contactName || undefined,
            contactPhone: formData.contactPhone || undefined,
            // C1.1: 未勾選時送 false（後端預設也是 false，行為一致）
            isMassCasualty: formData.isMassCasualty,
            casualtyEstimate: formData.casualtyEstimate
                ? Number(formData.casualtyEstimate)
                : undefined,
        };

        setIsSubmitting(true);
        setError(null);
        try {
            if (!isOnline) {
                // 離線：直接進 outbox（只有 2xx 才會被移除，資料不遺失）
                await offlineService.queueIntakeReport(payload);
                setSubmitResult('queued');
                return;
            }
            await createReport(payload);
            setSubmitResult('sent');
        } catch (err) {
            if (isNetworkError(err)) {
                // 拿不到伺服器回應（斷線/逾時）：改走離線暫存，不讓通報卡死
                try {
                    await offlineService.queueIntakeReport(payload);
                    setSubmitResult('queued');
                    return;
                } catch {
                    // outbox 也失敗（例如 storage 滿）才真的報錯
                }
            }
            console.error('Report submission error:', err);
            setError('提交失敗，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSubmitResult(null);
        setCurrentStep('type');
        setFormData(EMPTY_FORM);
    };

    // ===== 成功畫面（區分已送出／已暫存） =====
    if (submitResult) {
        const queued = submitResult === 'queued';
        return (
            <div className="page report-page">
                <Card className="report-success" padding="lg">
                    <div className="report-success__icon" aria-hidden="true">
                        {queued ? <CloudOff size={48} /> : <Send size={48} />}
                    </div>
                    {queued ? (
                        <>
                            <Badge variant="warning" dot>已暫存 · 待送出</Badge>
                            <h2>通報已暫存於此裝置</h2>
                            <p>
                                目前離線或連線不穩。通報已安全存放，
                                <strong>恢復連線後會自動送出</strong>，無需重新填寫。
                            </p>
                        </>
                    ) : (
                        <>
                            <Badge variant="success" dot>已送出</Badge>
                            <h2>通報已送出</h2>
                            <p>感謝您的災情通報！我們將盡快審核處理。</p>
                        </>
                    )}
                    <div className="report-success__buttons">
                        <Button size="lg" onClick={resetForm}>繼續通報</Button>
                        <Button size="lg" variant="secondary" onClick={() => navigate('/events')}>
                            查看所有事件
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // ===== 各步驟內容 =====
    // c4 問句頭：STEP stencil 小標 → 大標 → 橄欖短規線 → 一行提示
    const stepMeta = STEPS[currentStepIndex] ?? STEPS[0];
    const askHeader = (
        <header className="wizard-ask">
            <span className="wizard-ask__kicker u-stencil">
                STEP {String(currentStepIndex + 1).padStart(2, '0')} · {stepMeta.caption}
            </span>
            <h3 className="wizard-ask__title">{stepMeta.title}</h3>
            <span className="wizard-ask__rule" aria-hidden="true" />
            <p className="wizard-ask__hint">{stepMeta.hint}</p>
        </header>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 'type':
                return (
                    <div className="wizard-step">
                        {askHeader}

                        {/* C1.1: 民防類別獨立分組，避免與天災混在同一片網格中誤選 */}
                        {DISASTER_TYPE_GROUPS.map(group => (
                            <div key={group.title} className="disaster-type-group" role="group" aria-label={group.title}>
                                <h4 className="disaster-type-group__title">{group.title}</h4>
                                <div className="disaster-type-grid">
                                    {group.options.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            className={`disaster-type-card ${formData.type === type.value ? 'active' : ''}`}
                                            aria-pressed={formData.type === type.value}
                                            onClick={() => updateField('type', type.value)}
                                        >
                                            <span className="disaster-type-card__meta">
                                                <span className="disaster-type-card__index u-mono" aria-hidden="true">
                                                    {disasterOrdinal(type.value)}
                                                </span>
                                                <span className="disaster-type-card__icon">
                                                    <type.Icon size={22} color={type.color} aria-hidden="true" />
                                                </span>
                                            </span>
                                            <span className="disaster-type-card__label">{type.label}</span>
                                            <span className="disaster-type-card__desc">{type.description}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="form-section">
                            <span className="form-label" id="severity-label">嚴重程度</span>
                            <div className="severity-grid" role="group" aria-labelledby="severity-label">
                                {SEVERITY_LEVELS.map(level => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        className={`severity-btn severity-btn--${level.value} ${formData.severity === level.value ? 'active' : ''}`}
                                        aria-pressed={formData.severity === level.value}
                                        onClick={() => updateField('severity', level.value)}
                                    >
                                        <span className="severity-dot" aria-hidden="true" />
                                        <span className="severity-label">{level.label}</span>
                                        <span className="severity-desc">{level.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* C1.1: 大量傷患是跨災型旗標，因此是獨立勾選而非災型選項 */}
                        <div className="form-section">
                            <label className="mass-casualty-toggle">
                                <input
                                    type="checkbox"
                                    checked={formData.isMassCasualty}
                                    onChange={e => updateField('isMassCasualty', e.target.checked)}
                                />
                                <MASS_CASUALTY_META.Icon size={20} color={MASS_CASUALTY_META.color} aria-hidden="true" />
                                <span>
                                    {MASS_CASUALTY_META.label}事件（{MASS_CASUALTY_META.description}）
                                </span>
                            </label>
                            {formData.isMassCasualty && (
                                <input
                                    type="number"
                                    className="form-input"
                                    min={0}
                                    inputMode="numeric"
                                    placeholder="概估傷患人數（可留空）"
                                    aria-label="概估傷患人數"
                                    value={formData.casualtyEstimate}
                                    onChange={e => updateField('casualtyEstimate', e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                );

            case 'scene':
                return (
                    <div className="wizard-step">
                        {askHeader}

                        {/* 定位（自動取得，可重新定位） */}
                        <div className={`location-status-card ${formData.latitude !== null ? 'located' : ''}`}>
                            <div className="location-status-icon" aria-hidden="true">
                                <MapPin size={24} />
                            </div>
                            <div className="location-status-info">
                                {formData.latitude !== null && formData.longitude !== null ? (
                                    <>
                                        <span className="location-status-label">已取得位置</span>
                                        <span className="location-status-coords">
                                            {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="location-status-label">
                                            {isLocating ? '定位中…' : '尚未定位'}
                                        </span>
                                        <span className="location-status-hint">通報需要位置才能派遣</span>
                                    </>
                                )}
                            </div>
                            <button
                                type="button"
                                className="location-refresh-btn"
                                onClick={getLocation}
                                disabled={isLocating}
                            >
                                <LocateFixed size={18} aria-hidden="true" />
                                {isLocating ? '定位中' : '重新定位'}
                            </button>
                        </div>

                        {/* 照片（優先於文字） */}
                        <div className="form-section">
                            <span className="form-label">現場照片（選填，最多 {MAX_PHOTOS} 張）</span>
                            <div className="photo-preview-grid">
                                {formData.photos.map((photo, index) => (
                                    <div key={index} className="photo-preview-item">
                                        <img src={photo} alt={`災情照片 ${index + 1}`} />
                                        <button
                                            type="button"
                                            className="photo-remove-btn"
                                            aria-label={`移除照片 ${index + 1}`}
                                            onClick={() => removePhoto(index)}
                                        >
                                            <X size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                                {formData.photos.length < MAX_PHOTOS && (
                                    <label className="photo-add-btn">
                                        <Camera size={24} aria-hidden="true" />
                                        <span>拍照／相簿</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            hidden
                                            onChange={(e) => {
                                                addPhotos(e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* 文字描述（可語音輸入、可留空） */}
                        <div className="form-section">
                            <div className="form-label-row">
                                <label className="form-label" htmlFor="report-description">
                                    描述（可留空）
                                </label>
                                {speechSupported && (
                                    <button
                                        type="button"
                                        className={`voice-input-btn ${isListening ? 'listening' : ''}`}
                                        aria-pressed={isListening}
                                        onClick={toggleVoiceInput}
                                    >
                                        <Mic size={18} aria-hidden="true" />
                                        {isListening ? '停止語音' : '語音輸入'}
                                    </button>
                                )}
                            </div>
                            <textarea
                                id="report-description"
                                className="form-textarea"
                                placeholder={selectedMeta
                                    ? `說明${selectedMeta.label}狀況：範圍、影響、是否有人受困…（留空將以「${selectedMeta.label}災情通報」送出）`
                                    : '說明現場狀況…'}
                                value={formData.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label" htmlFor="report-address">地址／地標（選填）</label>
                            <input
                                id="report-address"
                                type="text"
                                className="form-input"
                                placeholder="例如：中山路與民族路口"
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'confirm': {
                const severity = SEVERITY_LEVELS.find(s => s.value === formData.severity);
                return (
                    <div className="wizard-step">
                        {askHeader}

                        <div className="confirm-summary">
                            <div className="confirm-item">
                                <span className="confirm-label">災害類型</span>
                                <span className="confirm-value confirm-value--type">
                                    {selectedMeta && (
                                        <selectedMeta.Icon size={18} color={selectedMeta.color} aria-hidden="true" />
                                    )}
                                    {selectedMeta?.label}
                                </span>
                            </div>
                            {/* C1.1: MCI 旗標顯示於確認頁 */}
                            {formData.isMassCasualty && (
                                <div className="confirm-item">
                                    <span className="confirm-label">{MASS_CASUALTY_META.label}</span>
                                    <Badge variant="danger" dot>
                                        是{formData.casualtyEstimate ? `（約 ${formData.casualtyEstimate} 人）` : ''}
                                    </Badge>
                                </div>
                            )}
                            <div className="confirm-item">
                                <span className="confirm-label">嚴重程度</span>
                                <span className={`severity-badge severity-badge--${formData.severity}`}>
                                    {severity?.label}
                                </span>
                            </div>
                            <div className="confirm-item">
                                <span className="confirm-label">位置</span>
                                <span className="confirm-value confirm-value--coords">
                                    {formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}
                                    {formData.address && `（${formData.address}）`}
                                </span>
                            </div>
                            <div className="confirm-item confirm-item--full">
                                <span className="confirm-label">描述</span>
                                <p className="confirm-description">
                                    {formData.description.trim()
                                        || `（未填寫，將以「${selectedMeta?.label ?? ''}災情通報」送出）`}
                                </p>
                            </div>
                            {formData.photos.length > 0 && (
                                <div className="confirm-item confirm-item--full">
                                    <span className="confirm-label">照片（{formData.photos.length} 張）</span>
                                    <div className="confirm-photos">
                                        {formData.photos.map((photo, i) => (
                                            <img key={i} src={photo} alt={`照片 ${i + 1}`} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <details className="contact-section">
                            <summary>聯絡資訊（選填）</summary>
                            <div className="contact-grid">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="姓名"
                                    aria-label="聯絡人姓名"
                                    value={formData.contactName}
                                    onChange={(e) => updateField('contactName', e.target.value)}
                                />
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="電話"
                                    aria-label="聯絡電話"
                                    value={formData.contactPhone}
                                    onChange={(e) => updateField('contactPhone', e.target.value)}
                                />
                            </div>
                        </details>

                        {!isOnline && (
                            <p className="offline-submit-note" role="status">
                                <CloudOff size={16} aria-hidden="true" />
                                目前離線：送出後通報會先存放在此裝置，恢復連線自動送出。
                            </p>
                        )}
                    </div>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className="page report-page">
            <header className="report-page__header">
                <div className="report-page__heading">
                    <h2>災情通報</h2>
                    <span className="report-page__kicker u-stencil">RAPID REPORT</span>
                </div>
                {/* 離線可用性明示（DESIGN_LANGUAGE §7.4 / 3.4 outbox） */}
                {!isOnline && (
                    <span className="report-offline-badge" role="status">
                        <CloudOff size={14} aria-hidden="true" />
                        離線模式 · 通報將暫存後自動送出
                    </span>
                )}
                {/* c4 步驟章：1/3（進度語意由下方 <ol> 提供，此處僅視覺章） */}
                <span className="report-step-chip u-mono" aria-hidden="true">
                    {currentStepIndex + 1}/{STEPS.length}
                </span>
            </header>

            {/* 三段進度規線（c4）：當前段橄欖實心；已完成卡其實心＋✓；未到描邊 */}
            <ol className="wizard-progress" aria-label={`通報進度：第 ${currentStepIndex + 1} 步，共 ${STEPS.length} 步`}>
                {STEPS.map((step, index) => (
                    <li
                        key={step.key}
                        className={`wizard-progress__step ${index < currentStepIndex ? 'completed' : index === currentStepIndex ? 'active' : ''}`}
                        aria-current={index === currentStepIndex ? 'step' : undefined}
                    >
                        <span className="wizard-progress__bar" aria-hidden="true" />
                        <span className="wizard-progress__label">
                            <span className="wizard-progress__index u-mono" aria-hidden="true">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            {step.label}
                            {index < currentStepIndex && (
                                <span className="wizard-progress__check" aria-hidden="true">✓</span>
                            )}
                        </span>
                    </li>
                ))}
            </ol>

            <Card className="wizard-content" padding="lg">
                {error && (
                    <div className="report-error" role="alert">{error}</div>
                )}

                {renderStepContent()}
            </Card>

            {/* 拇指區底欄（c4）：已選摘要與大按鈕同列供最後核對；主要動作固定下半屏 */}
            <div className="wizard-navigation">
                {currentStep === 'type' && selectedMeta && formData.type && (
                    <p className="wizard-picked">
                        <span className="wizard-picked__tag u-stencil">SELECTED</span>
                        <b>{selectedMeta.label}</b>
                        <span className="u-mono">{disasterOrdinal(formData.type)}</span>
                        <span className="wizard-picked__hint">· 下一步將標定位置</span>
                    </p>
                )}
                <div className="wizard-navigation__buttons">
                    {currentStepIndex > 0 && (
                        <Button
                            variant="secondary"
                            size="lg"
                            className="wizard-navigation__prev"
                            onClick={prevStep}
                        >
                            <ChevronLeft size={18} aria-hidden="true" /> 上一步
                        </Button>
                    )}
                    {currentStepIndex < STEPS.length - 1 ? (
                        <Button size="lg" className="wizard-navigation__primary" onClick={nextStep}>
                            下一步 <ChevronRight size={18} aria-hidden="true" />
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            className="wizard-navigation__primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            <Send size={18} aria-hidden="true" />
                            {isSubmitting ? '送出中…' : isOnline ? '送出通報' : '離線暫存送出'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
