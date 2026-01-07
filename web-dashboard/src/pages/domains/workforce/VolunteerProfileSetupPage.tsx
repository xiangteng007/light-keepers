import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { createVolunteer, markVolunteerProfileCompleted } from '../api/services';
import type { CreateVolunteerDto } from '../api/services';
import { User, MapPin, Heart, AlertCircle, Save, ChevronRight } from 'lucide-react';
import './VolunteerProfileSetupPage.css';

// 台灣地區選項
const REGIONS = [
    '台北�?, '新北�?, '基隆�?, '桃園�?, '新竹�?, '新竹�?,
    '苗栗�?, '台中�?, '彰化�?, '南投�?, '雲林�?, '嘉義�?,
    '嘉義�?, '台南�?, '高雄�?, '屏東�?, '宜蘭�?, '花蓮�?,
    '台東�?, '澎湖�?, '金門�?, '連江�?
];

// 技能選�?
const SKILL_OPTIONS = [
    { id: 'first_aid', label: '急救/CPR', icon: '🏥' },
    { id: 'driving', label: '駕駛（汽機車�?, icon: '🚗' },
    { id: 'cooking', label: '烹飪', icon: '🍳' },
    { id: 'construction', label: '土木/水電', icon: '🔧' },
    { id: 'medical', label: '醫療護理', icon: '💊' },
    { id: 'communication', label: '通訊操作', icon: '📻' },
    { id: 'translation', label: '翻譯（外語）', icon: '🌐' },
    { id: 'counseling', label: '心理輔導', icon: '💬' },
    { id: 'logistics', label: '物資管理', icon: '📦' },
    { id: 'photography', label: '攝影記錄', icon: '📷' },
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
                    setError('請輸入您的姓�?);
                    return false;
                }
                if (!formData.phone.trim() || formData.phone.length < 10) {
                    setError('請輸入有效的手機號碼');
                    return false;
                }
                return true;
            case 2:
                if (!formData.region) {
                    setError('請選擇您的服務區�?);
                    return false;
                }
                return true;
            case 3:
                if (formData.skills.length === 0) {
                    setError('請至少選擇一項技�?);
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
            // 標記志工資料已完�?
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
                    <h1>🎉 歡迎加入曦望燈塔�?/h1>
                    <p>請填寫您的志工資料，完成後即可開始服�?/p>
                </div>

                {/* 步驟指示�?*/}
                <div className="volunteer-setup-steps">
                    {[
                        { num: 1, label: '基本資料' },
                        { num: 2, label: '服務區�? },
                        { num: 3, label: '專業技�? },
                        { num: 4, label: '緊急聯�? },
                    ].map(({ num, label }) => (
                        <div
                            key={num}
                            className={`setup-step ${step === num ? 'active' : ''} ${step > num ? 'completed' : ''}`}
                        >
                            <div className="setup-step__number">{step > num ? '�? : num}</div>
                            <span className="setup-step__label">{label}</span>
                        </div>
                    ))}
                </div>

                <div className="volunteer-setup-form">
                    {/* 步驟 1: 基本資料 */}
                    {step === 1 && (
                        <div className="setup-section">
                            <div className="setup-section__icon"><User size={32} /></div>
                            <h2>基本資料</h2>
                            <p>請填寫您的個人基本資訊</p>

                            <div className="form-group">
                                <label htmlFor="name">姓名 *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    placeholder="請輸入您的真實姓�?
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
                                    placeholder="例如�?912345678"
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
                                    placeholder="請輸入電子郵�?
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled
                                />
                            </div>
                        </div>
                    )}

                    {/* 步驟 2: 服務區�?*/}
                    {step === 2 && (
                        <div className="setup-section">
                            <div className="setup-section__icon"><MapPin size={32} /></div>
                            <h2>服務區�?/h2>
                            <p>選擇您方便服務的區�?/p>

                            <div className="form-group">
                                <label htmlFor="region">主要服務區�?*</label>
                                <select
                                    id="region"
                                    name="region"
                                    value={formData.region}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">請選擇區�?/option>
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
                                    placeholder="方便我們安排就近任�?
                                    value={formData.address}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* 步驟 3: 專業技�?*/}
                    {step === 3 && (
                        <div className="setup-section">
                            <div className="setup-section__icon"><Heart size={32} /></div>
                            <h2>專業技�?/h2>
                            <p>選擇您具備的技能（可多選）</p>

                            <div className="skills-grid">
                                {SKILL_OPTIONS.map(skill => (
                                    <button
                                        key={skill.id}
                                        type="button"
                                        className={`skill-chip ${formData.skills.includes(skill.id) ? 'active' : ''}`}
                                        onClick={() => toggleSkill(skill.id)}
                                    >
                                        <span className="skill-chip__icon">{skill.icon}</span>
                                        <span className="skill-chip__label">{skill.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="form-group" style={{ marginTop: '20px' }}>
                                <label htmlFor="notes">其他專長（選填）</label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    placeholder="例如：無人機操作、水上救�?.."
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* 步驟 4: 緊急聯�?*/}
                    {step === 4 && (
                        <div className="setup-section">
                            <div className="setup-section__icon"><AlertCircle size={32} /></div>
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
                                <label htmlFor="emergencyPhone">緊急聯絡電�?/label>
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
                                    <span>姓名�?/span>
                                    <strong>{formData.name}</strong>
                                </div>
                                <div className="summary-item">
                                    <span>手機�?/span>
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
                                        ).join('�?) || '�?}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="setup-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* 按鈕區 */}
                    <div className="setup-actions">
                        {step > 1 && (
                            <button
                                type="button"
                                className="setup-btn setup-btn--secondary"
                                onClick={prevStep}
                            >
                                上一�?
                            </button>
                        )}

                        {step < 4 ? (
                            <button
                                type="button"
                                className="setup-btn setup-btn--primary"
                                onClick={nextStep}
                            >
                                下一�?<ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="setup-btn setup-btn--success"
                                onClick={handleSubmit}
                                disabled={isLoading}
                            >
                                <Save size={18} />
                                {isLoading ? '儲存�?..' : '完成設定'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
