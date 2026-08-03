import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createVolunteer, markVolunteerProfileCompleted } from '../api/services';
import type { CreateVolunteerDto } from '../api/services';
// 保留 lucide（R5/T6 誠實清單）：Save（儲存動作）
import { Save } from 'lucide-react';
import { Button, Alert } from '../design-system';
import {
    AedIcon,
    VehicleIcon,
    FlaskIcon,
    BuildingIcon,
    TriageIcon,
    RadioIcon,
    BookIcon,
    SupportIcon,
    InventoryIcon,
    CameraIcon,
    UserIcon,
    LocationIcon,
    HeartIcon,
    WarningIcon,
    ChevronRightIcon,
    CheckIcon,
    type LkIcon,
} from '../design-system/icons';
import './VolunteerProfileSetupPage.css';

// 台灣地區選項
const REGIONS = [
    '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣',
    '苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣', '嘉義市',
    '嘉義縣', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣',
    '台東縣', '澎湖縣', '金門縣', '連江縣'
];

// 技能選項（R5/T5c：B3c 教範圖例，不再使用 emoji）
const SKILL_OPTIONS: { id: string; label: string; Icon: LkIcon }[] = [
    { id: 'first_aid', label: '急救/CPR', Icon: AedIcon },
    { id: 'driving', label: '駕駛（汽機車）', Icon: VehicleIcon },
    { id: 'cooking', label: '烹飪', Icon: FlaskIcon },
    { id: 'construction', label: '土木/水電', Icon: BuildingIcon },
    { id: 'medical', label: '醫療護理', Icon: TriageIcon },
    { id: 'communication', label: '通訊操作', Icon: RadioIcon },
    { id: 'translation', label: '翻譯（外語）', Icon: BookIcon },
    { id: 'counseling', label: '心理輔導', Icon: SupportIcon },
    { id: 'logistics', label: '物資管理', Icon: InventoryIcon },
    { id: 'photography', label: '攝影記錄', Icon: CameraIcon },
];

export default function VolunteerProfileSetupPage() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateVolunteerDto>({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        region: '',
        address: '',
        skills: [],
        emergencyContact: '',
        emergencyPhone: '',
        notes: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const toggleSkill = (skillId: string) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.includes(skillId)
                ? prev.skills.filter(s => s !== skillId)
                : [...prev.skills, skillId]
        }));
    };

    const validateStep = (stepNum: number): boolean => {
        switch (stepNum) {
            case 1:
                if (!formData.name.trim()) {
                    setError('請輸入您的姓名');
                    return false;
                }
                if (!formData.phone.trim() || formData.phone.length < 10) {
                    setError('請輸入有效的手機號碼');
                    return false;
                }
                return true;
            case 2:
                if (!formData.region) {
                    setError('請選擇您的服務區域');
                    return false;
                }
                return true;
            case 3:
                if (formData.skills.length === 0) {
                    setError('請至少選擇一項技能');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(step + 1);
            setError(null);
        }
    };

    const prevStep = () => {
        setStep(step - 1);
        setError(null);
    };

    const handleSubmit = async () => {
        if (!validateStep(4)) return;

        setIsLoading(true);
        setError(null);

        try {
            // 建立志工資料
            await createVolunteer(formData);
            // 標記志工資料已完成
            await markVolunteerProfileCompleted();
            // 刷新用戶資料
            await refreshUser?.();
            // 導向儀表板
            navigate('/dashboard', { replace: true });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || '儲存失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="volunteer-setup-page">
            <div className="volunteer-setup-container">
                <div className="volunteer-setup-header">
                    <h1>歡迎加入曦望燈塔！</h1>
                    <p>請填寫您的志工資料，完成後即可開始服務</p>
                </div>

                {/* 步驟指示器 */}
                <div className="volunteer-setup-steps" role="list" aria-label="設定步驟">
                    {[
                        { num: 1, label: '基本資料' },
                        { num: 2, label: '服務區域' },
                        { num: 3, label: '專業技能' },
                        { num: 4, label: '緊急聯絡' },
                    ].map(({ num, label }) => (
                        <div
                            key={num}
                            className={`setup-step ${step === num ? 'active' : ''} ${step > num ? 'completed' : ''}`}
                            role="listitem"
                            aria-current={step === num ? 'step' : undefined}
                        >
                            <div className="setup-step__number" aria-hidden="true">{step > num ? <CheckIcon size={16} aria-hidden="true" /> : num}</div>
                            <span className="setup-step__label">
                                {label}
                                {step > num && <span className="sr-only">（已完成）</span>}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="volunteer-setup-form">
                    {/* 步驟 1: 基本資料 */}
                    {step === 1 && (
                        <div className="setup-section">
                            <div className="setup-section__icon"><UserIcon size={32} aria-hidden="true" /></div>
                            <h2>基本資料</h2>
                            <p>請填寫您的個人基本資訊</p>

                            <div className="form-group">
                                <label htmlFor="name">姓名 *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    placeholder="請輸入您的真實姓名"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">手機號碼 *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    placeholder="例如：0912345678"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">電子郵件</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="請輸入電子郵件"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled
                                />
                            </div>
                        </div>
                    )}

                    {/* 步驟 2: 服務區域 */}
                    {step === 2 && (
                        <div className="setup-section">
                            <div className="setup-section__icon"><LocationIcon size={32} aria-hidden="true" /></div>
                            <h2>服務區域</h2>
                            <p>選擇您方便服務的區域</p>

                            <div className="form-group">
                                <label htmlFor="region">主要服務區域 *</label>
                                <select
                                    id="region"
                                    name="region"
                                    value={formData.region}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">請選擇區域</option>
                                    {REGIONS.map(region => (
                                        <option key={region} value={region}>{region}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="address">詳細地址（選填）</label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    placeholder="方便我們安排就近任務"
                                    value={formData.address}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* 步驟 3: 專業技能 */}
                    {step === 3 && (
                        <div className="setup-section">
                            <div className="setup-section__icon"><HeartIcon size={32} aria-hidden="true" /></div>
                            <h2>專業技能</h2>
                            <p>選擇您具備的技能（可多選）</p>

                            <div className="skills-grid" role="group" aria-label="技能選項（可多選）">
                                {SKILL_OPTIONS.map(skill => {
                                    const selected = formData.skills.includes(skill.id);
                                    return (
                                        <button
                                            key={skill.id}
                                            type="button"
                                            className={`skill-chip ${selected ? 'active' : ''}`}
                                            onClick={() => toggleSkill(skill.id)}
                                            aria-pressed={selected}
                                        >
                                            <span className="skill-chip__icon" aria-hidden="true"><skill.Icon size={16} /></span>
                                            <span className="skill-chip__label">{skill.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="form-group" style={{ marginTop: '20px' }}>
                                <label htmlFor="notes">其他專長（選填）</label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    placeholder="例如：無人機操作、水上救生..."
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* 步驟 4: 緊急聯絡 */}
                    {step === 4 && (
                        <div className="setup-section">
                            <div className="setup-section__icon"><WarningIcon size={32} aria-hidden="true" /></div>
                            <h2>緊急聯絡人</h2>
                            <p>以便在緊急情況時聯繫</p>

                            <div className="form-group">
                                <label htmlFor="emergencyContact">緊急聯絡人姓名</label>
                                <input
                                    type="text"
                                    id="emergencyContact"
                                    name="emergencyContact"
                                    placeholder="例如：家人或朋友"
                                    value={formData.emergencyContact}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="emergencyPhone">緊急聯絡電話</label>
                                <input
                                    type="tel"
                                    id="emergencyPhone"
                                    name="emergencyPhone"
                                    placeholder="請輸入緊急聯絡人電話"
                                    value={formData.emergencyPhone}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* 資料摘要 */}
                            <div className="setup-summary">
                                <h4>資料確認</h4>
                                <div className="summary-item">
                                    <span>姓名：</span>
                                    <strong>{formData.name}</strong>
                                </div>
                                <div className="summary-item">
                                    <span>手機：</span>
                                    <strong>{formData.phone}</strong>
                                </div>
                                <div className="summary-item">
                                    <span>區域：</span>
                                    <strong>{formData.region}</strong>
                                </div>
                                <div className="summary-item">
                                    <span>技能：</span>
                                    <strong>
                                        {formData.skills.map(s =>
                                            SKILL_OPTIONS.find(o => o.id === s)?.label
                                        ).join('、') || '無'}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <Alert variant="danger" className="setup-error">
                            {error}
                        </Alert>
                    )}

                    {/* 按鈕區 */}
                    <div className="setup-actions">
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="secondary"
                                className="setup-btn setup-btn--secondary"
                                onClick={prevStep}
                            >
                                上一步
                            </Button>
                        )}

                        {step < 4 ? (
                            <Button
                                type="button"
                                variant="primary"
                                className="setup-btn setup-btn--primary"
                                icon={<ChevronRightIcon size={16} aria-hidden="true" />}
                                onClick={nextStep}
                            >
                                下一步
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="primary"
                                className="setup-btn setup-btn--success"
                                icon={<Save size={18} aria-hidden="true" />}
                                onClick={handleSubmit}
                                loading={isLoading}
                            >
                                {isLoading ? '儲存中...' : '完成設定'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
