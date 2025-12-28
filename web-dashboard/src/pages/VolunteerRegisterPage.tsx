import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Alert } from '../design-system';
import { useAuth } from '../context/AuthContext';
import { createVolunteer } from '../api/services';

// 技能選項
const SKILL_OPTIONS = [
    { value: 'medical', label: '醫療救護', icon: '🏥' },
    { value: 'rescue', label: '搜救救難', icon: '🚒' },
    { value: 'logistics', label: '物資運送', icon: '📦' },
    { value: 'cooking', label: '炊事料理', icon: '🍳' },
    { value: 'communication', label: '通訊聯絡', icon: '📡' },
    { value: 'driving', label: '駕駛運輸', icon: '🚗' },
    { value: 'construction', label: '土木修繕', icon: '🔧' },
    { value: 'social', label: '社工關懷', icon: '💝' },
];

interface VolunteerForm {
    name: string;
    phone: string;
    email: string;
    region: string;
    address: string;
    skills: string[];
    emergencyContact: string;
    emergencyPhone: string;
    notes: string;
}

const INITIAL_FORM: VolunteerForm = {
    name: '',
    phone: '',
    email: '',
    region: '',
    address: '',
    skills: [],
    emergencyContact: '',
    emergencyPhone: '',
    notes: '',
};

export default function VolunteerRegisterPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState<VolunteerForm>(INITIAL_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 檢查是否已綁定 LINE 和 Google
    const hasLineBinding = !!(user as any)?.lineUserId;
    const hasGoogleBinding = !!(user as any)?.googleId;
    const canRegister = hasLineBinding && hasGoogleBinding;

    // 技能選擇切換
    const toggleSkill = (skillValue: string) => {
        setForm(prev => ({
            ...prev,
            skills: prev.skills.includes(skillValue)
                ? prev.skills.filter(s => s !== skillValue)
                : [...prev.skills, skillValue]
        }));
    };

    // 提交志工申請
    const handleSubmit = async () => {
        if (!form.name || !form.phone || !form.region || !form.emergencyContact || !form.emergencyPhone) {
            setError('請填寫必填欄位：姓名、電話、所在地區、緊急聯絡人、緊急聯絡電話');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await createVolunteer({
                ...form,
                accountId: user?.id,
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Failed to register volunteer:', err);
            setError('登記失敗，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 已提交成功畫面
    if (submitted) {
        return (
            <div className="page volunteer-register-page">
                <Card padding="lg" className="register-success-card">
                    <div className="success-content">
                        <span className="success-icon">✅</span>
                        <h2>志工登記申請已送出</h2>
                        <p>感謝您願意加入 Light Keepers 志工團隊！</p>
                        <p className="note">您的申請正在等待管理員審核，審核通過後您將收到通知。</p>
                        <Button onClick={() => navigate('/dashboard')}>返回首頁</Button>
                    </div>
                </Card>
            </div>
        );
    }

    // 未綁定帳號提示
    if (!canRegister) {
        return (
            <div className="page volunteer-register-page">
                <div className="page-header">
                    <h2>📋 登記志工</h2>
                    <p className="page-subtitle">加入 Light Keepers 志工團隊</p>
                </div>

                <Alert variant="warning" title="需要完成帳號綁定">
                    <p>登記志工前，請先完成以下帳號綁定：</p>
                    <div className="binding-checklist">
                        <div className={`binding-item ${hasLineBinding ? 'done' : ''}`}>
                            <span className="binding-icon">{hasLineBinding ? '✅' : '❌'}</span>
                            <span>LINE 帳號綁定</span>
                        </div>
                        <div className={`binding-item ${hasGoogleBinding ? 'done' : ''}`}>
                            <span className="binding-icon">{hasGoogleBinding ? '✅' : '❌'}</span>
                            <span>Google 帳號綁定</span>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={() => navigate('/settings')}>
                        前往設定綁定帳號
                    </Button>
                </Alert>
            </div>
        );
    }

    return (
        <div className="page volunteer-register-page">
            <div className="page-header">
                <h2>📋 登記志工</h2>
                <p className="page-subtitle">加入 Light Keepers 志工團隊</p>
            </div>

            {error && (
                <Alert variant="danger" title="錯誤" closable onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Card padding="lg">
                <div className="register-form">
                    <div className="form-row">
                        <div className="form-section">
                            <label className="form-label">姓名 *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="請輸入姓名"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="form-section">
                            <label className="form-label">電話 *</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="09XX-XXX-XXX"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-section">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="volunteer@email.com"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <div className="form-section">
                            <label className="form-label">所在地區 *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例如：台北市中山區"
                                value={form.region}
                                onChange={e => setForm({ ...form, region: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <label className="form-label">
                            詳細地址
                            <Badge variant="info" size="sm">🔒 僅管理員可見</Badge>
                        </label>
                        <input
                            type="text"
                            className="form-input form-input--private"
                            placeholder="詳細地址（選填）"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                        />
                    </div>

                    <div className="form-section">
                        <label className="form-label">專長技能</label>
                        <div className="skills-grid skills-grid--improved">
                            {SKILL_OPTIONS.map(skill => (
                                <button
                                    key={skill.value}
                                    type="button"
                                    className={`skill-btn skill-btn--toggle ${form.skills.includes(skill.value) ? 'skill-btn--selected' : ''}`}
                                    onClick={() => toggleSkill(skill.value)}
                                >
                                    <span className="skill-btn__icon">{skill.icon}</span>
                                    <span className="skill-btn__label">{skill.label}</span>
                                    {form.skills.includes(skill.value) && (
                                        <span className="skill-btn__check">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-section">
                            <label className="form-label">
                                緊急聯絡人 *
                                <Badge variant="info" size="sm">🔒 僅管理員可見</Badge>
                            </label>
                            <input
                                type="text"
                                className="form-input form-input--private"
                                placeholder="聯絡人姓名"
                                value={form.emergencyContact}
                                onChange={e => setForm({ ...form, emergencyContact: e.target.value })}
                            />
                        </div>
                        <div className="form-section">
                            <label className="form-label">
                                緊急聯絡電話 *
                                <Badge variant="info" size="sm">🔒 僅管理員可見</Badge>
                            </label>
                            <input
                                type="tel"
                                className="form-input form-input--private"
                                placeholder="緊急聯絡電話"
                                value={form.emergencyPhone}
                                onChange={e => setForm({ ...form, emergencyPhone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <label className="form-label">備註事項（過敏原或慢性疾病等需特別註記事項）</label>
                        <textarea
                            className="form-textarea"
                            placeholder="請填寫過敏原、慢性疾病或其他需要特別注意的事項..."
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="form-actions">
                        <Button variant="secondary" onClick={() => navigate(-1)}>
                            取消
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? '提交中...' : '✅ 提交申請'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
