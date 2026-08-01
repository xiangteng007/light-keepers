import { useState, useEffect } from 'react';
import { Car } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { vehiclesApi } from '../api/vms';
import type { VolunteerVehicle, VehicleType, VehiclePurpose } from '../api/vms';
import { Card, Button, Badge, Tag, Alert, Modal, InputField } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './VehicleManagementPage.css';

// 車輛類型選項
const VEHICLE_TYPES: { code: VehicleType; name: string; icon: string }[] = [
    { code: 'car', name: '汽車', icon: '🚗' },
    { code: 'motorcycle', name: '機車', icon: '🏍️' },
    { code: 'boat', name: '船艇', icon: '🚤' },
    { code: 'atv', name: 'ATV/沙灘車', icon: '🛻' },
    { code: 'truck', name: '貨車/卡車', icon: '🚚' },
    { code: 'other', name: '其他', icon: '🚙' },
];

// 車輛用途選項
const VEHICLE_PURPOSES: { code: VehiclePurpose; name: string }[] = [
    { code: 'rescue', name: '救援' },
    { code: 'transport', name: '運補' },
    { code: 'towing', name: '拖吊' },
    { code: 'patrol', name: '巡邏' },
    { code: 'other', name: '其他' },
];

interface VehicleFormData {
    licensePlate: string;
    vehicleType: VehicleType;
    brand: string;
    model: string;
    engineCc: string;
    color: string;
    purposes: VehiclePurpose[];
    modifications: string;
    insuranceCompany: string;
    insurancePolicyNo: string;
    insuranceExpiresAt: string;
    notes: string;
}

const INITIAL_FORM: VehicleFormData = {
    licensePlate: '',
    vehicleType: 'car',
    brand: '',
    model: '',
    engineCc: '',
    color: '',
    purposes: [],
    modifications: '',
    insuranceCompany: '',
    insurancePolicyNo: '',
    insuranceExpiresAt: '',
    notes: '',
};

export default function VehicleManagementPage() {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState<VolunteerVehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<VolunteerVehicle | null>(null);
    const [form, setForm] = useState<VehicleFormData>(INITIAL_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 獲取志工 ID (假設從 user 關聯)
    const volunteerId = (user as any)?.volunteerId || user?.id;

    // 載入車輛列表
    useEffect(() => {
        if (volunteerId) {
            loadVehicles();
        }
    }, [volunteerId]);

    const loadVehicles = async () => {
        try {
            setIsLoading(true);
            const response = await vehiclesApi.getByVolunteer(volunteerId);
            setVehicles(response.data);
        } catch (err) {
            console.error('Failed to load vehicles:', err);
            setError('載入車輛資料失敗');
        } finally {
            setIsLoading(false);
        }
    };

    // 開啟新增車輛 Modal
    const handleAdd = () => {
        setEditingVehicle(null);
        setForm(INITIAL_FORM);
        setShowModal(true);
    };

    // 開啟編輯車輛 Modal
    const handleEdit = (vehicle: VolunteerVehicle) => {
        setEditingVehicle(vehicle);
        setForm({
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType,
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            engineCc: vehicle.engineCc?.toString() || '',
            color: vehicle.color || '',
            purposes: vehicle.purposes || [],
            modifications: vehicle.modifications || '',
            insuranceCompany: vehicle.insuranceCompany || '',
            insurancePolicyNo: vehicle.insurancePolicyNo || '',
            insuranceExpiresAt: vehicle.insuranceExpiresAt?.split('T')[0] || '',
            notes: vehicle.notes || '',
        });
        setShowModal(true);
    };

    // 切換用途選擇
    const togglePurpose = (purpose: VehiclePurpose) => {
        setForm(prev => ({
            ...prev,
            purposes: prev.purposes.includes(purpose)
                ? prev.purposes.filter(p => p !== purpose)
                : [...prev.purposes, purpose]
        }));
    };

    // 提交表單
    const handleSubmit = async () => {
        if (!form.licensePlate) {
            setError('請填寫車牌號碼');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const data: Partial<VolunteerVehicle> = {
                ...form,
                volunteerId,
                engineCc: form.engineCc ? parseInt(form.engineCc) : undefined,
            };

            if (editingVehicle) {
                await vehiclesApi.update(editingVehicle.id, data);
            } else {
                await vehiclesApi.create(data);
            }

            setShowModal(false);
            loadVehicles();
        } catch (err) {
            console.error('Failed to save vehicle:', err);
            setError('儲存失敗，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 刪除車輛
    const handleDelete = async (id: string) => {
        if (!window.confirm('確定要刪除此車輛？')) return;

        try {
            await vehiclesApi.delete(id);
            loadVehicles();
        } catch (err) {
            console.error('Failed to delete vehicle:', err);
            setError('刪除失敗');
        }
    };

    // 計算保險到期狀態
    const getInsuranceStatus = (expiresAt?: string) => {
        if (!expiresAt) return { status: 'unknown', label: '未設定', color: 'gray' };
        const expDate = new Date(expiresAt);
        const now = new Date();
        const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return { status: 'expired', label: '已過期', color: 'red' };
        if (daysLeft <= 30) return { status: 'expiring', label: `${daysLeft}天後到期`, color: 'orange' };
        return { status: 'valid', label: '有效', color: 'green' };
    };

    return (
        <div className="page vehicle-management-page">
            <div className="page-header">
                <div className="header-left">
                    <h1>我的車輛</h1>
                    <p className="page-subtitle">管理您的救援車輛資訊</p>
                </div>
                <Button onClick={handleAdd}>+ 新增車輛</Button>
            </div>

            {error && (
                <Alert variant="danger" closable onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {isLoading ? (
                <div className="vehicles-grid" aria-busy="true" aria-label="載入車輛資料中">
                    <Skeleton variant="card" height={220} count={3} />
                </div>
            ) : vehicles.length === 0 ? (
                <EmptyState
                    icon={Car}
                    title="尚未登記車輛"
                    description="登記您的車輛以便任務派遣時使用"
                    action={{ label: '新增第一輛車', onClick: handleAdd }}
                />
            ) : (
                <div className="vehicles-grid">
                    {vehicles.map(vehicle => {
                        const insuranceStatus = getInsuranceStatus(vehicle.insuranceExpiresAt);
                        const typeInfo = VEHICLE_TYPES.find(t => t.code === vehicle.vehicleType);

                        return (
                            <Card key={vehicle.id} padding="md" className="vehicle-card">
                                <div className="vehicle-header">
                                    <span className="vehicle-icon">{typeInfo?.icon || '🚙'}</span>
                                    <span className="vehicle-plate">{vehicle.licensePlate}</span>
                                </div>

                                <div className="vehicle-info">
                                    <div className="info-row">
                                        <span className="info-label">類型</span>
                                        <span className="info-value">{typeInfo?.name || '其他'}</span>
                                    </div>
                                    {vehicle.brand && (
                                        <div className="info-row">
                                            <span className="info-label">廠牌型號</span>
                                            <span className="info-value">{vehicle.brand} {vehicle.model}</span>
                                        </div>
                                    )}
                                    {vehicle.purposes && vehicle.purposes.length > 0 && (
                                        <div className="info-row">
                                            <span className="info-label">用途</span>
                                            <div className="purpose-tags">
                                                {vehicle.purposes.map(p => (
                                                    <Tag key={p} size="sm">
                                                        {VEHICLE_PURPOSES.find(vp => vp.code === p)?.name}
                                                    </Tag>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="info-row">
                                        <span className="info-label">保險狀態</span>
                                        <Badge variant={
                                            insuranceStatus.color === 'green' ? 'success' :
                                                insuranceStatus.color === 'orange' ? 'warning' :
                                                    insuranceStatus.color === 'red' ? 'danger' : 'default'
                                        } size="sm">
                                            {insuranceStatus.label}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="vehicle-actions">
                                    <Button variant="secondary" size="sm" onClick={() => handleEdit(vehicle)}>
                                        編輯
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(vehicle.id)}>
                                        刪除
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* 新增/編輯 Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingVehicle ? '編輯車輛' : '新增車輛'}
                size="lg"
            >
                <div className="vehicle-form">
                    <div className="form-row">
                        <InputField
                            label="車牌號碼 *"
                            placeholder="ABC-1234"
                            value={form.licensePlate}
                            onChange={e => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                            fullWidth
                        />
                        <div className="form-section">
                            <label className="form-label" htmlFor="vehicle-type">車輛類型 *</label>
                            <select
                                id="vehicle-type"
                                className="form-select"
                                value={form.vehicleType}
                                onChange={e => setForm({ ...form, vehicleType: e.target.value as VehicleType })}
                            >
                                {VEHICLE_TYPES.map(type => (
                                    <option key={type.code} value={type.code}>
                                        {type.icon} {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <InputField
                            label="廠牌"
                            placeholder="Toyota"
                            value={form.brand}
                            onChange={e => setForm({ ...form, brand: e.target.value })}
                            fullWidth
                        />
                        <InputField
                            label="型號"
                            placeholder="RAV4"
                            value={form.model}
                            onChange={e => setForm({ ...form, model: e.target.value })}
                            fullWidth
                        />
                    </div>

                    <div className="form-row">
                        <InputField
                            label="排氣量 (cc)"
                            type="number"
                            placeholder="2000"
                            value={form.engineCc}
                            onChange={e => setForm({ ...form, engineCc: e.target.value })}
                            fullWidth
                        />
                        <InputField
                            label="顏色"
                            placeholder="白色"
                            value={form.color}
                            onChange={e => setForm({ ...form, color: e.target.value })}
                            fullWidth
                        />
                    </div>

                    <div className="form-section">
                        <span className="form-label" id="purpose-group-label">車輛用途</span>
                        <div className="purpose-options" role="group" aria-labelledby="purpose-group-label">
                            {VEHICLE_PURPOSES.map(purpose => (
                                <button
                                    key={purpose.code}
                                    type="button"
                                    aria-pressed={form.purposes.includes(purpose.code)}
                                    className={`purpose-btn ${form.purposes.includes(purpose.code) ? 'is-selected' : ''}`}
                                    onClick={() => togglePurpose(purpose.code)}
                                >
                                    {purpose.name}
                                    {form.purposes.includes(purpose.code) && ' ✓'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-section">
                        <label className="form-label" htmlFor="vehicle-modifications">特殊改裝說明</label>
                        <textarea
                            id="vehicle-modifications"
                            className="form-textarea"
                            placeholder="例如：加裝絞盤、車頂架、無線電等"
                            value={form.modifications}
                            onChange={e => setForm({ ...form, modifications: e.target.value })}
                            rows={2}
                        />
                    </div>

                    <div className="form-divider">
                        <span>車輛保險資訊</span>
                    </div>

                    <div className="form-row">
                        <InputField
                            label="保險公司"
                            placeholder="新光產險"
                            value={form.insuranceCompany}
                            onChange={e => setForm({ ...form, insuranceCompany: e.target.value })}
                            fullWidth
                        />
                        <InputField
                            label="保單編號"
                            placeholder="保單編號"
                            value={form.insurancePolicyNo}
                            onChange={e => setForm({ ...form, insurancePolicyNo: e.target.value })}
                            fullWidth
                        />
                    </div>

                    <InputField
                        label="保險到期日"
                        type="date"
                        value={form.insuranceExpiresAt}
                        onChange={e => setForm({ ...form, insuranceExpiresAt: e.target.value })}
                        fullWidth
                    />

                    <div className="form-section">
                        <label className="form-label" htmlFor="vehicle-notes">備註</label>
                        <textarea
                            id="vehicle-notes"
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
