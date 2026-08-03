import { useState, useEffect } from 'react';
/* EmptyState 的 icon prop 型別鎖 LucideIcon，ShieldCheck 暫留該處 */
import { ShieldCheck } from 'lucide-react';
import { ShieldIcon } from '../design-system/icons';
import { useAuth } from '../context/AuthContext';
import { insuranceApi } from '../api/vms';
import type { VolunteerInsurance, InsuranceType } from '../api/vms';
import { Card, Button, Badge, Tag, Alert, Modal, InputField } from '../design-system';
import type { BadgeProps } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './InsuranceManagementPage.css';

// 保險類型選項
const INSURANCE_TYPES: { code: InsuranceType; name: string; description: string }[] = [
    { code: 'personal', name: '個人保險', description: '志工自行投保' },
    { code: 'group', name: '團體保險', description: '協會統一投保' },
    { code: 'task_specific', name: '任務專屬', description: '指定任務保險' },
];

// 任務類型（用於保障範圍）
const TASK_TYPES = [
    { code: 'training', name: '教育訓練' },
    { code: 'standby', name: '待命值班' },
    { code: 'emergency', name: '緊急救援' },
    { code: 'operation', name: '專案任務' },
];

interface InsuranceFormData {
    insuranceType: InsuranceType;
    insuranceCompany: string;
    policyNumber: string;
    coverageType: string;
    coverageAmount: string;
    validFrom: string;
    validTo: string;
    coversTasks: string[];
    notes: string;
}

const INITIAL_FORM: InsuranceFormData = {
    insuranceType: 'personal',
    insuranceCompany: '',
    policyNumber: '',
    coverageType: '',
    coverageAmount: '',
    validFrom: '',
    validTo: '',
    coversTasks: [],
    notes: '',
};

export default function InsuranceManagementPage() {
    const { user } = useAuth();
    const [insurances, setInsurances] = useState<VolunteerInsurance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingInsurance, setEditingInsurance] = useState<VolunteerInsurance | null>(null);
    const [form, setForm] = useState<InsuranceFormData>(INITIAL_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const volunteerId = (user as any)?.volunteerId || user?.id;

    useEffect(() => {
        if (volunteerId) {
            loadInsurances();
        }
    }, [volunteerId]);

    const loadInsurances = async () => {
        try {
            setIsLoading(true);
            const response = await insuranceApi.getByVolunteer(volunteerId);
            setInsurances(response.data);
        } catch (err) {
            console.error('Failed to load insurances:', err);
            setError('載入保險資料失敗');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingInsurance(null);
        setForm(INITIAL_FORM);
        setShowModal(true);
    };

    const handleEdit = (insurance: VolunteerInsurance) => {
        setEditingInsurance(insurance);
        setForm({
            insuranceType: insurance.insuranceType,
            insuranceCompany: insurance.insuranceCompany,
            policyNumber: insurance.policyNumber || '',
            coverageType: insurance.coverageType || '',
            coverageAmount: insurance.coverageAmount?.toString() || '',
            validFrom: insurance.validFrom.split('T')[0],
            validTo: insurance.validTo.split('T')[0],
            coversTasks: insurance.coversTasks || [],
            notes: insurance.notes || '',
        });
        setShowModal(true);
    };

    const toggleTaskCoverage = (taskCode: string) => {
        setForm(prev => ({
            ...prev,
            coversTasks: prev.coversTasks.includes(taskCode)
                ? prev.coversTasks.filter(t => t !== taskCode)
                : [...prev.coversTasks, taskCode]
        }));
    };

    const handleSubmit = async () => {
        if (!form.insuranceCompany || !form.validFrom || !form.validTo) {
            setError('請填寫必要欄位：保險公司、生效日、到期日');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const data: Partial<VolunteerInsurance> = {
                ...form,
                volunteerId,
                coverageAmount: form.coverageAmount ? parseFloat(form.coverageAmount) : undefined,
            };

            if (editingInsurance) {
                await insuranceApi.update(editingInsurance.id, data);
            } else {
                await insuranceApi.create(data);
            }

            setShowModal(false);
            loadInsurances();
        } catch (err) {
            console.error('Failed to save insurance:', err);
            setError('儲存失敗，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('確定要刪除此保險紀錄？')) return;

        try {
            await insuranceApi.delete(id);
            loadInsurances();
        } catch (err) {
            console.error('Failed to delete insurance:', err);
            setError('刪除失敗');
        }
    };

    const getInsuranceStatus = (insurance: VolunteerInsurance): { status: string; label: string; variant: BadgeProps['variant'] } => {
        const now = new Date();
        const validFrom = new Date(insurance.validFrom);
        const validTo = new Date(insurance.validTo);

        if (now < validFrom) return { status: 'pending', label: '尚未生效', variant: 'default' };
        if (now > validTo) return { status: 'expired', label: '已過期', variant: 'danger' };

        const daysLeft = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) return { status: 'expiring', label: `${daysLeft}天後到期`, variant: 'warning' };

        return { status: 'active', label: '有效', variant: 'success' };
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('zh-TW');
    };

    const formatAmount = (amount?: number) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="page insurance-management-page">
            <div className="page-header">
                <div className="header-left">
                    <h1>我的保險</h1>
                    <p className="page-subtitle">管理您的志工保險紀錄</p>
                </div>
                <Button onClick={handleAdd}>+ 新增保險</Button>
            </div>

            {error && (
                <Alert variant="danger" closable onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* 保障狀態摘要 */}
            <Card padding="md" className="coverage-summary">
                <div className="summary-content">
                    <ShieldIcon size={28} aria-hidden="true" className="summary-icon" />
                    <div className="summary-text">
                        <strong>保障狀態：</strong>
                        {insurances.some(ins => getInsuranceStatus(ins).status === 'active') ? (
                            <Badge variant="success">有有效保障</Badge>
                        ) : (
                            <Badge variant="warning">無有效保障</Badge>
                        )}
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="insurances-list" aria-busy="true" aria-label="載入保險資料中">
                    <Skeleton variant="card" height={180} count={3} />
                </div>
            ) : insurances.length === 0 ? (
                <EmptyState
                    icon={ShieldCheck}
                    title="尚無保險紀錄"
                    description="新增您的保險資料以確保任務出勤時有保障"
                    action={{ label: '新增第一筆保險', onClick: handleAdd }}
                />
            ) : (
                <div className="insurances-list">
                    {insurances.map(insurance => {
                        const status = getInsuranceStatus(insurance);
                        const typeInfo = INSURANCE_TYPES.find(t => t.code === insurance.insuranceType);

                        return (
                            <Card key={insurance.id} padding="md" className="insurance-card">
                                <div className="insurance-header">
                                    <div className="insurance-company">
                                        <span className="company-name">{insurance.insuranceCompany}</span>
                                        <Badge variant={typeInfo ? 'info' : 'default'} size="sm">
                                            {typeInfo?.name || '保險'}
                                        </Badge>
                                    </div>
                                    <Badge variant={status.variant} size="sm">
                                        {status.label}
                                    </Badge>
                                </div>

                                <div className="insurance-info">
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">保單編號</span>
                                            <span className="info-value">{insurance.policyNumber || '-'}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">保障金額</span>
                                            <span className="info-value">{formatAmount(insurance.coverageAmount)}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">生效日期</span>
                                            <span className="info-value">{formatDate(insurance.validFrom)}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">到期日期</span>
                                            <span className="info-value">{formatDate(insurance.validTo)}</span>
                                        </div>
                                    </div>

                                    {insurance.coversTasks && insurance.coversTasks.length > 0 && (
                                        <div className="coverage-tasks">
                                            <span className="tasks-label">保障任務：</span>
                                            <div className="task-tags">
                                                {insurance.coversTasks.map(taskCode => (
                                                    <Tag key={taskCode} size="sm">
                                                        {TASK_TYPES.find(t => t.code === taskCode)?.name || taskCode}
                                                    </Tag>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="insurance-actions">
                                    <Button variant="secondary" size="sm" onClick={() => handleEdit(insurance)}>
                                        編輯
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(insurance.id)}>
                                        刪除
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal 表單 */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingInsurance ? '編輯保險' : '新增保險'}
                size="lg"
            >
                <div className="insurance-form">
                    <div className="form-row">
                        <div className="form-section">
                            <label className="form-label" htmlFor="insurance-type">保險類型 *</label>
                            <select
                                id="insurance-type"
                                className="form-select"
                                value={form.insuranceType}
                                onChange={e => setForm({ ...form, insuranceType: e.target.value as InsuranceType })}
                            >
                                {INSURANCE_TYPES.map(type => (
                                    <option key={type.code} value={type.code}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <InputField
                            label="保險公司 *"
                            placeholder="新光產險"
                            value={form.insuranceCompany}
                            onChange={e => setForm({ ...form, insuranceCompany: e.target.value })}
                            fullWidth
                        />
                    </div>

                    <div className="form-row">
                        <InputField
                            label="保單編號"
                            placeholder="保單編號"
                            value={form.policyNumber}
                            onChange={e => setForm({ ...form, policyNumber: e.target.value })}
                            fullWidth
                        />
                        <InputField
                            label="保障金額 (TWD)"
                            type="number"
                            placeholder="1000000"
                            value={form.coverageAmount}
                            onChange={e => setForm({ ...form, coverageAmount: e.target.value })}
                            fullWidth
                        />
                    </div>

                    <InputField
                        label="保障類型說明"
                        placeholder="例如：意外險、醫療險"
                        value={form.coverageType}
                        onChange={e => setForm({ ...form, coverageType: e.target.value })}
                        fullWidth
                    />

                    <div className="form-row">
                        <InputField
                            label="生效日期 *"
                            type="date"
                            value={form.validFrom}
                            onChange={e => setForm({ ...form, validFrom: e.target.value })}
                            fullWidth
                        />
                        <InputField
                            label="到期日期 *"
                            type="date"
                            value={form.validTo}
                            onChange={e => setForm({ ...form, validTo: e.target.value })}
                            fullWidth
                        />
                    </div>

                    <div className="form-section">
                        <span className="form-label" id="task-coverage-label">涵蓋任務類型</span>
                        <div className="task-options" role="group" aria-labelledby="task-coverage-label">
                            {TASK_TYPES.map(task => (
                                <button
                                    key={task.code}
                                    type="button"
                                    aria-pressed={form.coversTasks.includes(task.code)}
                                    className={`task-btn ${form.coversTasks.includes(task.code) ? 'is-selected' : ''}`}
                                    onClick={() => toggleTaskCoverage(task.code)}
                                >
                                    {task.name}
                                    {form.coversTasks.includes(task.code) && ' ✓'}
                                </button>
                            ))}
                        </div>
                        <small className="form-hint">不選擇則表示涵蓋所有任務類型</small>
                    </div>

                    <div className="form-section">
                        <label className="form-label" htmlFor="insurance-notes">備註</label>
                        <textarea
                            id="insurance-notes"
                            className="form-textarea"
                            placeholder="其他備註事項"
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            rows={2}
                        />
                    </div>

                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowModal(false)}>
                            取消
                        </Button>
                        <Button onClick={handleSubmit} loading={isSubmitting}>
                            儲存
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
