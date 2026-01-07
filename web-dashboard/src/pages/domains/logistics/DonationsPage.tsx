import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge, Modal } from '../design-system';
import {
    getDonationStats,
    getDonations,
    getDonors,
    createDonation,
    confirmPayment,
    getExportCsvUrl,
} from '../api';
import type {
    Donation,
    Donor,
    CreateDonationDto
} from '../api';
import { useAuth } from '../../../context/AuthContext';
import './DonationsPage.css';

// 快速金額選�?
const QUICK_AMOUNTS = [100, 300, 500, 1000, 3000, 5000];

// 支付方式選項
const PAYMENT_METHODS = [
    { value: 'credit_card', label: '信用�? },
    { value: 'atm', label: 'ATM 轉帳' },
    { value: 'bank_transfer', label: '銀行匯�? },
    { value: 'cash', label: '現金' },
];

export default function DonationsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isOwner = (user?.roleLevel ?? 0) >= 5;

    const [activeTab, setActiveTab] = useState<'overview' | 'donations' | 'donors'>('overview');
    const [showDonationModal, setShowDonationModal] = useState(false);

    // 捐款表單狀�?
    const [donorName, setDonorName] = useState('');
    const [donorEmail, setDonorEmail] = useState('');
    const [donorPhone, setDonorPhone] = useState('');
    const [donorType, setDonorType] = useState<'individual' | 'corporate'>('individual');
    const [amount, setAmount] = useState(1000);
    const [customAmount, setCustomAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [purpose, setPurpose] = useState('');
    const [wantsReceipt, setWantsReceipt] = useState(true);
    const [isAnonymous, setIsAnonymous] = useState(false);

    // 查詢統計
    const { data: stats } = useQuery({
        queryKey: ['donationStats'],
        queryFn: () => getDonationStats().then(res => res.data.data),
    });

    // 查詢捐款列表
    const { data: donationsData } = useQuery({
        queryKey: ['donations'],
        queryFn: () => getDonations({ limit: 20 }).then(res => res.data),
    });

    // 查詢捐款人列�?
    const { data: donorsData } = useQuery({
        queryKey: ['donors'],
        queryFn: () => getDonors({ limit: 20 }).then(res => res.data),
    });

    // 建立捐款
    const createMutation = useMutation({
        mutationFn: (data: CreateDonationDto) => createDonation(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['donations'] });
            queryClient.invalidateQueries({ queryKey: ['donationStats'] });
            setShowDonationModal(false);
            resetForm();
            alert('捐款已建立！');
        },
        onError: (err: Error) => alert('建立失敗: ' + err.message),
    });

    // 確認付款 (測試�?
    const confirmMutation = useMutation({
        mutationFn: ({ merchantTradeNo, transactionId }: { merchantTradeNo: string; transactionId: string }) =>
            confirmPayment(merchantTradeNo, transactionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['donations'] });
            queryClient.invalidateQueries({ queryKey: ['donationStats'] });
            alert('付款已確認！');
        },
    });

    const resetForm = () => {
        setDonorName('');
        setDonorEmail('');
        setDonorPhone('');
        setDonorType('individual');
        setAmount(1000);
        setCustomAmount('');
        setPaymentMethod('bank_transfer');
        setPurpose('');
        setWantsReceipt(true);
        setIsAnonymous(false);
    };

    const handleSubmitDonation = () => {
        const finalAmount = customAmount ? parseInt(customAmount) : amount;
        if (!donorName || !finalAmount) {
            alert('請填寫必要欄�?);
            return;
        }

        createMutation.mutate({
            donor: {
                type: donorType,
                name: donorName,
                email: donorEmail || undefined,
                phone: donorPhone || undefined,
                isAnonymous,
                wantsReceipt,
            },
            amount: finalAmount,
            paymentMethod: paymentMethod as CreateDonationDto['paymentMethod'],
            purpose: purpose || undefined,
        });
    };

    const handleConfirmPayment = (donation: Donation) => {
        if (confirm(`確認捐款 ${donation.merchantTradeNo} 已收到款項？`)) {
            confirmMutation.mutate({
                merchantTradeNo: donation.merchantTradeNo,
                transactionId: `MANUAL-${Date.now()}`,
            });
        }
    };

    const formatCurrency = (num: number) =>
        new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    };

    if (!isOwner) {
        return (
            <div className="page donations-page">
                <Card padding="lg">
                    <div className="access-denied">
                        <span className="icon">🔒</span>
                        <h3>權限不足</h3>
                        <p>此功能僅限系統擁有者使�?/p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="page donations-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>💰 捐款管理</h2>
                    <p className="page-subtitle">公益捐款收支管理</p>
                </div>
                <div className="page-header__actions">
                    <a
                        href={getExportCsvUrl()}
                        className="export-btn"
                        download
                    >
                        📊 匯出報表
                    </a>
                    <Button variant="primary" onClick={() => setShowDonationModal(true)}>
                        �?新增捐款
                    </Button>
                </div>
            </div>

            {/* 標籤切換 */}
            <div className="tab-bar">
                <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                    📊 總覽
                </button>
                <button className={activeTab === 'donations' ? 'active' : ''} onClick={() => setActiveTab('donations')}>
                    📋 捐款紀�?
                </button>
                <button className={activeTab === 'donors' ? 'active' : ''} onClick={() => setActiveTab('donors')}>
                    👥 捐款�?
                </button>
            </div>

            {/* 總覽 */}
            {activeTab === 'overview' && stats && (
                <div className="stats-overview">
                    <div className="stats-grid">
                        <Card className="stat-card" padding="md">
                            <div className="stat-card__icon">💰</div>
                            <div className="stat-card__content">
                                <div className="stat-card__value">{formatCurrency(stats.totalAmount)}</div>
                                <div className="stat-card__label">累計捐款</div>
                            </div>
                        </Card>
                        <Card className="stat-card" padding="md">
                            <div className="stat-card__icon">📅</div>
                            <div className="stat-card__content">
                                <div className="stat-card__value">{formatCurrency(stats.monthAmount)}</div>
                                <div className="stat-card__label">本月捐款</div>
                            </div>
                        </Card>
                        <Card className="stat-card" padding="md">
                            <div className="stat-card__icon">🎯</div>
                            <div className="stat-card__content">
                                <div className="stat-card__value">{formatCurrency(stats.todayAmount)}</div>
                                <div className="stat-card__label">今日捐款</div>
                            </div>
                        </Card>
                        <Card className="stat-card" padding="md">
                            <div className="stat-card__icon">👥</div>
                            <div className="stat-card__content">
                                <div className="stat-card__value">{stats.donorCount}</div>
                                <div className="stat-card__label">捐款人數</div>
                            </div>
                        </Card>
                        <Card className="stat-card" padding="md">
                            <div className="stat-card__icon">📝</div>
                            <div className="stat-card__content">
                                <div className="stat-card__value">{stats.totalDonations}</div>
                                <div className="stat-card__label">捐款筆數</div>
                            </div>
                        </Card>
                        <Card className="stat-card" padding="md">
                            <div className="stat-card__icon">📊</div>
                            <div className="stat-card__content">
                                <div className="stat-card__value">
                                    {stats.totalDonations > 0 ? formatCurrency(stats.totalAmount / stats.totalDonations) : '$0'}
                                </div>
                                <div className="stat-card__label">平均捐款</div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* 捐款紀�?*/}
            {activeTab === 'donations' && (
                <Card title="捐款紀�? padding="lg">
                    <div className="donations-table-container">
                        <table className="donations-table">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>捐款�?/th>
                                    <th>金額</th>
                                    <th>方式</th>
                                    <th>狀�?/th>
                                    <th>收據</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {donationsData?.data?.map((donation: Donation) => (
                                    <tr key={donation.id}>
                                        <td>{formatDate(donation.createdAt)}</td>
                                        <td>{donation.donor?.isAnonymous ? '善心人士' : donation.donor?.name}</td>
                                        <td className="amount">{formatCurrency(donation.amount)}</td>
                                        <td>
                                            <Badge variant="info">
                                                {PAYMENT_METHODS.find(m => m.value === donation.paymentMethod)?.label || donation.paymentMethod}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge variant={donation.status === 'paid' ? 'success' : donation.status === 'pending' ? 'warning' : 'danger'}>
                                                {donation.status === 'paid' ? '已入�? : donation.status === 'pending' ? '待確�? : donation.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            {donation.receipt ? (
                                                <a
                                                    href={`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-890013751803.asia-east1.run.app'}/donations/receipts/${donation.receipt.id}/pdf`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="receipt-download-link"
                                                >
                                                    📄 {donation.receipt.receiptNo}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {donation.status === 'pending' && (
                                                <Button size="sm" variant="primary" onClick={() => handleConfirmPayment(donation)}>
                                                    確認入帳
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(!donationsData?.data || donationsData.data.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="empty-row">暫無捐款紀�?/td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* 捐款�?*/}
            {activeTab === 'donors' && (
                <Card title="捐款人列�? padding="lg">
                    <div className="donations-table-container">
                        <table className="donations-table">
                            <thead>
                                <tr>
                                    <th>姓名</th>
                                    <th>類型</th>
                                    <th>Email</th>
                                    <th>電話</th>
                                    <th>捐款次數</th>
                                    <th>累計金額</th>
                                    <th>加入日期</th>
                                </tr>
                            </thead>
                            <tbody>
                                {donorsData?.data?.map((donor: Donor) => (
                                    <tr key={donor.id}>
                                        <td>{donor.isAnonymous ? '善心人士' : donor.name}</td>
                                        <td>
                                            <Badge variant={donor.type === 'corporate' ? 'info' : 'default'}>
                                                {donor.type === 'corporate' ? '企業' : '個人'}
                                            </Badge>
                                        </td>
                                        <td>{donor.email || '-'}</td>
                                        <td>{donor.phone || '-'}</td>
                                        <td>{donor.totalDonationCount}</td>
                                        <td className="amount">{formatCurrency(donor.totalDonationAmount)}</td>
                                        <td>{formatDate(donor.createdAt)}</td>
                                    </tr>
                                ))}
                                {(!donorsData?.data || donorsData.data.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="empty-row">暫無捐款�?/td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* 新增捐款 Modal */}
            <Modal
                isOpen={showDonationModal}
                onClose={() => setShowDonationModal(false)}
                title="新增捐款"
                size="lg"
            >
                <div className="donation-form">
                    <div className="form-section">
                        <h4>捐款人資�?/h4>
                        <div className="form-row">
                            <label>類型</label>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        checked={donorType === 'individual'}
                                        onChange={() => setDonorType('individual')}
                                    /> 個人
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        checked={donorType === 'corporate'}
                                        onChange={() => setDonorType('corporate')}
                                    /> 企業
                                </label>
                            </div>
                        </div>
                        <div className="form-row">
                            <label>姓名/公司名稱 *</label>
                            <input
                                type="text"
                                value={donorName}
                                onChange={e => setDonorName(e.target.value)}
                                placeholder="請輸入捐款人姓名"
                            />
                        </div>
                        <div className="form-row">
                            <label>Email</label>
                            <input
                                type="email"
                                value={donorEmail}
                                onChange={e => setDonorEmail(e.target.value)}
                                placeholder="收據寄�?Email"
                            />
                        </div>
                        <div className="form-row">
                            <label>電話</label>
                            <input
                                type="tel"
                                value={donorPhone}
                                onChange={e => setDonorPhone(e.target.value)}
                                placeholder="聯絡電話"
                            />
                        </div>
                        <div className="form-row checkbox-row">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={e => setIsAnonymous(e.target.checked)}
                                /> 匿名捐款
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={wantsReceipt}
                                    onChange={e => setWantsReceipt(e.target.checked)}
                                /> 需要收�?
                            </label>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>捐款金額</h4>
                        <div className="quick-amounts">
                            {QUICK_AMOUNTS.map(amt => (
                                <button
                                    key={amt}
                                    className={amount === amt && !customAmount ? 'active' : ''}
                                    onClick={() => { setAmount(amt); setCustomAmount(''); }}
                                >
                                    ${amt.toLocaleString()}
                                </button>
                            ))}
                        </div>
                        <div className="form-row">
                            <label>自訂金額</label>
                            <input
                                type="number"
                                value={customAmount}
                                onChange={e => setCustomAmount(e.target.value)}
                                placeholder="輸入自訂金額"
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>付款方式</h4>
                        <div className="form-row">
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                {PAYMENT_METHODS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>用途說�?/h4>
                        <div className="form-row">
                            <textarea
                                value={purpose}
                                onChange={e => setPurpose(e.target.value)}
                                placeholder="例：救災基金、設備採�?.."
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button variant="secondary" onClick={() => setShowDonationModal(false)}>
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmitDonation}
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? '處理�?..' : '確認新增'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
