/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
import React, { useState, useEffect } from 'react';
import './IAPManagerPage.css';

interface Objective {
    id: string;
    priority: number;
    description: string;
    measurable: string;
    status: 'pending' | 'in_progress' | 'achieved' | 'not_achieved';
}

interface OperationalPeriod {
    id: string;
    periodNumber: number;
    name: string;
    objectives: Objective[];
    priorities: string[];
    commanderGuidance: string;
    status: 'draft' | 'approved' | 'active' | 'closed';
    startTime: string;
    endTime?: string;
    approvedBy?: string;
    approvedAt?: string;
}

interface IAPDocument {
    id: string;
    documentType: string;
    title: string;
    content: Record<string, any>;
    status: 'draft' | 'pending_review' | 'approved';
    version: number;
}

const ICS_DOCUMENT_TYPES = [
    { type: 'objectives', label: 'ICS 202 - 事件目標', icon: '🎯' },
    { type: 'organization', label: 'ICS 203 - 組織分配', icon: '👥' },
    { type: 'assignments', label: 'ICS 204 - 任務分配', icon: '📋' },
    { type: 'communications', label: 'ICS 205 - 通訊計畫', icon: '📡' },
    { type: 'medical', label: 'ICS 206 - 醫療計畫', icon: '🏥' },
    { type: 'resources', label: 'ICS 207 - 資源清單', icon: '📦' },
    { type: 'safety', label: 'ICS 208 - 安全訊息', icon: '⚠️' },
    { type: 'map_attachments', label: '地圖附錄', icon: '🗺️' },
];

const IAPManagerPage: React.FC = () => {
    const [periods, setPeriods] = useState<OperationalPeriod[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<OperationalPeriod | null>(null);
    const [documents, setDocuments] = useState<IAPDocument[]>([]);
    const [activeTab, setActiveTab] = useState<'periods' | 'documents' | 'export'>('periods');
    const [loading, setLoading] = useState(false);
    const [showNewPeriodForm, setShowNewPeriodForm] = useState(false);

    // Mock session ID - would come from context in real app
    const sessionId = 'current-session';

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) {
            fetchDocuments(selectedPeriod.id);
        }
    }, [selectedPeriod]);

    const fetchPeriods = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/missions/${sessionId}/iap/periods`);
            const data = await response.json();
            if (data.success) {
                setPeriods(data.data);
                if (data.data.length > 0 && !selectedPeriod) {
                    setSelectedPeriod(data.data[data.data.length - 1]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch periods:', error);
        }
        setLoading(false);
    };

    const fetchDocuments = async (periodId: string) => {
        try {
            const response = await fetch(`/api/missions/${sessionId}/iap/periods/${periodId}/documents`);
            const data = await response.json();
            if (data.success) {
                setDocuments(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        }
    };

    const createPeriod = async (formData: any) => {
        try {
            const response = await fetch(`/api/missions/${sessionId}/iap/periods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.success) {
                fetchPeriods();
                setShowNewPeriodForm(false);
            }
        } catch (error) {
            console.error('Failed to create period:', error);
        }
    };

    const approvePeriod = async (periodId: string) => {
        try {
            const response = await fetch(`/api/missions/${sessionId}/iap/periods/${periodId}/approve`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                fetchPeriods();
            }
        } catch (error) {
            console.error('Failed to approve period:', error);
        }
    };

    const activatePeriod = async (periodId: string) => {
        try {
            const response = await fetch(`/api/missions/${sessionId}/iap/periods/${periodId}/activate`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                fetchPeriods();
            }
        } catch (error) {
            console.error('Failed to activate period:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { label: string; class: string }> = {
            draft: { label: '草稿', class: 'badge-draft' },
            approved: { label: '已核准', class: 'badge-approved' },
            active: { label: '進行中', class: 'badge-active' },
            closed: { label: '已結束', class: 'badge-closed' },
        };
        return badges[status] || { label: status, class: '' };
    };

    return (
        <div className="iap-manager-page">
            <header className="iap-header">
                <div className="header-left">
                    <h1>📋 事件行動計畫 (IAP)</h1>
                    <p>ICS 作戰週期與文件管理</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-new-period"
                        onClick={() => setShowNewPeriodForm(true)}
                    >
                        ➕ 新增作戰週期
                    </button>
                </div>
            </header>

            <div className="iap-tabs">
                <button
                    className={activeTab === 'periods' ? 'active' : ''}
                    onClick={() => setActiveTab('periods')}
                >
                    ⏱️ 作戰週期
                </button>
                <button
                    className={activeTab === 'documents' ? 'active' : ''}
                    onClick={() => setActiveTab('documents')}
                    disabled={!selectedPeriod}
                >
                    📄 IAP 文件
                </button>
                <button
                    className={activeTab === 'export' ? 'active' : ''}
                    onClick={() => setActiveTab('export')}
                    disabled={!selectedPeriod}
                >
                    📤 匯出
                </button>
            </div>

            <div className="iap-content">
                {activeTab === 'periods' && (
                    <div className="periods-panel">
                        <div className="periods-list">
                            {periods.length === 0 ? (
                                <div className="empty-state">
                                    <p>尚未建立作戰週期</p>
                                    <button onClick={() => setShowNewPeriodForm(true)}>
                                        建立第一個週期
                                    </button>
                                </div>
                            ) : (
                                periods.map(period => (
                                    <div
                                        key={period.id}
                                        className={`period-card ${selectedPeriod?.id === period.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedPeriod(period)}
                                    >
                                        <div className="period-header">
                                            <span className="period-number">OP {period.periodNumber}</span>
                                            <span className={`status-badge ${getStatusBadge(period.status).class}`}>
                                                {getStatusBadge(period.status).label}
                                            </span>
                                        </div>
                                        <h3>{period.name || `作戰週期 ${period.periodNumber}`}</h3>
                                        <div className="period-time">
                                            {new Date(period.startTime).toLocaleString('zh-TW')}
                                        </div>
                                        {period.objectives.length > 0 && (
                                            <div className="period-objectives">
                                                {period.objectives.length} 個目標
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {selectedPeriod && (
                            <div className="period-detail">
                                <div className="detail-header">
                                    <h2>作戰週期 {selectedPeriod.periodNumber}</h2>
                                    <div className="detail-actions">
                                        {selectedPeriod.status === 'draft' && (
                                            <button
                                                className="btn-approve"
                                                onClick={() => approvePeriod(selectedPeriod.id)}
                                            >
                                                ✓ 核准
                                            </button>
                                        )}
                                        {selectedPeriod.status === 'approved' && (
                                            <button
                                                className="btn-activate"
                                                onClick={() => activatePeriod(selectedPeriod.id)}
                                            >
                                                ▶ 啟動
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h4>🎯 作戰目標</h4>
                                    {selectedPeriod.objectives.length === 0 ? (
                                        <p className="empty-text">尚未設定目標</p>
                                    ) : (
                                        <ul className="objectives-list">
                                            {selectedPeriod.objectives.map(obj => (
                                                <li key={obj.id}>
                                                    <span className="priority">P{obj.priority}</span>
                                                    <span className="description">{obj.description}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="detail-section">
                                    <h4>📌 優先事項</h4>
                                    {selectedPeriod.priorities.length === 0 ? (
                                        <p className="empty-text">尚未設定優先事項</p>
                                    ) : (
                                        <ol className="priorities-list">
                                            {selectedPeriod.priorities.map((p, i) => (
                                                <li key={i}>{p}</li>
                                            ))}
                                        </ol>
                                    )}
                                </div>

                                {selectedPeriod.commanderGuidance && (
                                    <div className="detail-section">
                                        <h4>💬 指揮官指導</h4>
                                        <p className="guidance-text">{selectedPeriod.commanderGuidance}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && selectedPeriod && (
                    <div className="documents-panel">
                        <div className="documents-grid">
                            {ICS_DOCUMENT_TYPES.map(docType => {
                                const doc = documents.find(d => d.documentType === docType.type);
                                return (
                                    <div
                                        key={docType.type}
                                        className={`document-card ${doc ? 'has-content' : ''}`}
                                    >
                                        <div className="doc-icon">{docType.icon}</div>
                                        <h4>{docType.label}</h4>
                                        {doc ? (
                                            <div className="doc-status">
                                                <span className={`status ${doc.status}`}>
                                                    {doc.status === 'approved' ? '✓ 已核准' :
                                                        doc.status === 'pending_review' ? '⏳ 待審' : '📝 草稿'}
                                                </span>
                                                <span className="version">v{doc.version}</span>
                                            </div>
                                        ) : (
                                            <span className="doc-empty">未建立</span>
                                        )}
                                        <button className="btn-edit">
                                            {doc ? '編輯' : '建立'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'export' && selectedPeriod && (
                    <div className="export-panel">
                        <h3>匯出 IAP</h3>
                        <p>將作戰週期 {selectedPeriod.periodNumber} 的所有已核准文件匯出</p>

                        <div className="export-options">
                            <button className="export-btn">
                                📄 匯出 PDF
                            </button>
                            <button className="export-btn">
                                📝 匯出 Word
                            </button>
                            <button className="export-btn">
                                🖨️ 列印
                            </button>
                        </div>

                        <div className="export-preview">
                            <h4>預覽內容</h4>
                            <ul>
                                {documents.filter(d => d.status === 'approved').map(doc => (
                                    <li key={doc.id}>
                                        ✓ {ICS_DOCUMENT_TYPES.find(t => t.type === doc.documentType)?.label}
                                    </li>
                                ))}
                            </ul>
                            {documents.filter(d => d.status === 'approved').length === 0 && (
                                <p className="warning">⚠️ 尚無已核准的文件可匯出</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showNewPeriodForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>新增作戰週期</h3>
                        <NewPeriodForm
                            onSubmit={createPeriod}
                            onCancel={() => setShowNewPeriodForm(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const NewPeriodForm: React.FC<{
    onSubmit: (data: any) => void;
    onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
    const [guidance, setGuidance] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            startTime: new Date(startTime).toISOString(),
            commanderGuidance: guidance,
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>週期名稱</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="例：第一作戰週期 (08:00-16:00)"
                />
            </div>
            <div className="form-group">
                <label>開始時間</label>
                <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>指揮官指導 (選填)</label>
                <textarea
                    value={guidance}
                    onChange={e => setGuidance(e.target.value)}
                    placeholder="本週期重點..."
                    rows={3}
                />
            </div>
            <div className="form-actions">
                <button type="button" onClick={onCancel}>取消</button>
                <button type="submit" className="primary">建立</button>
            </div>
        </form>
    );
};

export default IAPManagerPage;
