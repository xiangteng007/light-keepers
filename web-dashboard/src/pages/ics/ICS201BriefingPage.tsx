/**
 * ICS201BriefingPage.tsx
 * 
 * ICS Form 201 - Incident Briefing
 * Per Expert Council Navigation Design §7.1
 * 
 * Covers:
 * - Incident overview and situation
 * - Objectives and strategy
 * - Organization chart
 * - Resources summary
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FileText,
    MapPin,
    Calendar,
    Clock,
    Users,
    Target,
    AlertTriangle,
    Save,
    Printer,
    Share2,
    ChevronLeft,
} from 'lucide-react';
import './ICS201BriefingPage.css';

interface IncidentBriefing {
    incidentName: string;
    incidentNumber: string;
    dateTimePrepared: string;
    mapSketch: string;
    situationSummary: string;
    objectives: string[];
    currentStrategy: string;
    orgAssignments: OrgAssignment[];
    resourcesSummary: ResourceSummary[];
    preparedBy: string;
    approvedBy: string;
}

interface OrgAssignment {
    position: string;
    name: string;
    contact: string;
}

interface ResourceSummary {
    resourceType: string;
    quantity: number;
    location: string;
    eta?: string;
}

const INITIAL_BRIEFING: IncidentBriefing = {
    incidentName: '',
    incidentNumber: '',
    dateTimePrepared: new Date().toISOString().slice(0, 16),
    mapSketch: '',
    situationSummary: '',
    objectives: [''],
    currentStrategy: '',
    orgAssignments: [
        { position: 'Incident Commander', name: '', contact: '' },
        { position: 'Operations Section Chief', name: '', contact: '' },
        { position: 'Planning Section Chief', name: '', contact: '' },
        { position: 'Logistics Section Chief', name: '', contact: '' },
        { position: 'Finance/Admin Section Chief', name: '', contact: '' },
    ],
    resourcesSummary: [
        { resourceType: '', quantity: 0, location: '' },
    ],
    preparedBy: '',
    approvedBy: '',
};

export default function ICS201BriefingPage() {
    const [briefing, setBriefing] = useState<IncidentBriefing>(INITIAL_BRIEFING);
    const [activeSection, setActiveSection] = useState<number>(1);

    const updateField = <K extends keyof IncidentBriefing>(
        field: K,
        value: IncidentBriefing[K]
    ) => {
        setBriefing(prev => ({ ...prev, [field]: value }));
    };

    const addObjective = () => {
        setBriefing(prev => ({
            ...prev,
            objectives: [...prev.objectives, ''],
        }));
    };

    const updateObjective = (index: number, value: string) => {
        const newObjectives = [...briefing.objectives];
        newObjectives[index] = value;
        updateField('objectives', newObjectives);
    };

    const updateOrgAssignment = (index: number, field: keyof OrgAssignment, value: string) => {
        const newAssignments = [...briefing.orgAssignments];
        newAssignments[index] = { ...newAssignments[index], [field]: value };
        updateField('orgAssignments', newAssignments);
    };

    const handleSave = () => {
        // TODO: Save to backend
        console.log('Saving ICS 201:', briefing);
        alert('ICS 201 已儲存');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="ics201-page">
            {/* Header */}
            <header className="ics201-header">
                <div className="ics201-header-left">
                    <Link to="/ics" className="ics201-back">
                        <ChevronLeft size={20} />
                        <span>ICS 儀表板</span>
                    </Link>
                    <div className="ics201-title">
                        <FileText size={28} />
                        <div>
                            <h1>ICS 201 - 事件簡報</h1>
                            <p>Incident Briefing</p>
                        </div>
                    </div>
                </div>
                <div className="ics201-actions">
                    <button className="ics201-btn secondary" onClick={handlePrint}>
                        <Printer size={16} />
                        列印
                    </button>
                    <button className="ics201-btn secondary">
                        <Share2 size={16} />
                        分享
                    </button>
                    <button className="ics201-btn primary" onClick={handleSave}>
                        <Save size={16} />
                        儲存
                    </button>
                </div>
            </header>

            {/* Section Navigation */}
            <nav className="ics201-sections-nav" role="tablist">
                {[
                    { id: 1, label: '基本資訊', icon: FileText },
                    { id: 2, label: '情況摘要', icon: AlertTriangle },
                    { id: 3, label: '目標策略', icon: Target },
                    { id: 4, label: '組織架構', icon: Users },
                    { id: 5, label: '資源摘要', icon: MapPin },
                ].map(section => (
                    <button
                        key={section.id}
                        role="tab"
                        aria-selected={activeSection === section.id}
                        className={`ics201-section-tab ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(section.id)}
                    >
                        <section.icon size={16} />
                        <span>{section.label}</span>
                    </button>
                ))}
            </nav>

            {/* Form Content */}
            <div className="ics201-content" role="tabpanel">
                {/* Section 1: Basic Info */}
                {activeSection === 1 && (
                    <section className="ics201-form-section">
                        <h2>1. 基本資訊</h2>
                        <div className="ics201-form-grid">
                            <div className="ics201-field">
                                <label htmlFor="incidentName">事件名稱</label>
                                <input
                                    id="incidentName"
                                    type="text"
                                    value={briefing.incidentName}
                                    onChange={e => updateField('incidentName', e.target.value)}
                                    placeholder="例：颱風蘇力救災行動"
                                />
                            </div>
                            <div className="ics201-field">
                                <label htmlFor="incidentNumber">事件編號</label>
                                <input
                                    id="incidentNumber"
                                    type="text"
                                    value={briefing.incidentNumber}
                                    onChange={e => updateField('incidentNumber', e.target.value)}
                                    placeholder="例：TPE-2026-001"
                                />
                            </div>
                            <div className="ics201-field">
                                <label htmlFor="dateTimePrepared">
                                    <Calendar size={14} />
                                    製作日期時間
                                </label>
                                <input
                                    id="dateTimePrepared"
                                    type="datetime-local"
                                    value={briefing.dateTimePrepared}
                                    onChange={e => updateField('dateTimePrepared', e.target.value)}
                                />
                            </div>
                            <div className="ics201-field full-width">
                                <label htmlFor="preparedBy">製作人</label>
                                <input
                                    id="preparedBy"
                                    type="text"
                                    value={briefing.preparedBy}
                                    onChange={e => updateField('preparedBy', e.target.value)}
                                    placeholder="姓名 / 職稱"
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* Section 2: Situation Summary */}
                {activeSection === 2 && (
                    <section className="ics201-form-section">
                        <h2>2. 情況摘要</h2>
                        <div className="ics201-field full-width">
                            <label htmlFor="situationSummary">
                                <AlertTriangle size={14} />
                                當前情況描述
                            </label>
                            <textarea
                                id="situationSummary"
                                value={briefing.situationSummary}
                                onChange={e => updateField('situationSummary', e.target.value)}
                                rows={8}
                                placeholder="描述事件的性質、範圍、影響區域、傷亡情況、已採取的行動等..."
                            />
                        </div>
                        <div className="ics201-field full-width">
                            <label>地圖/草圖</label>
                            <div className="ics201-map-placeholder">
                                <MapPin size={32} />
                                <p>點擊上傳地圖或草圖</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Section 3: Objectives & Strategy */}
                {activeSection === 3 && (
                    <section className="ics201-form-section">
                        <h2>3. 目標與策略</h2>
                        <div className="ics201-field full-width">
                            <label>
                                <Target size={14} />
                                事件目標
                            </label>
                            <div className="ics201-objectives-list">
                                {briefing.objectives.map((obj, idx) => (
                                    <div key={idx} className="ics201-objective-item">
                                        <span className="ics201-obj-num">{idx + 1}.</span>
                                        <input
                                            type="text"
                                            value={obj}
                                            onChange={e => updateObjective(idx, e.target.value)}
                                            placeholder="輸入目標..."
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="ics201-add-btn"
                                    onClick={addObjective}
                                >
                                    + 新增目標
                                </button>
                            </div>
                        </div>
                        <div className="ics201-field full-width">
                            <label htmlFor="currentStrategy">當前策略</label>
                            <textarea
                                id="currentStrategy"
                                value={briefing.currentStrategy}
                                onChange={e => updateField('currentStrategy', e.target.value)}
                                rows={5}
                                placeholder="描述達成目標的整體策略..."
                            />
                        </div>
                    </section>
                )}

                {/* Section 4: Organization */}
                {activeSection === 4 && (
                    <section className="ics201-form-section">
                        <h2>4. 組織架構</h2>
                        <div className="ics201-org-chart">
                            {briefing.orgAssignments.map((assignment, idx) => (
                                <div key={idx} className="ics201-org-row">
                                    <div className="ics201-org-position">
                                        {assignment.position}
                                    </div>
                                    <input
                                        type="text"
                                        value={assignment.name}
                                        onChange={e => updateOrgAssignment(idx, 'name', e.target.value)}
                                        placeholder="姓名"
                                        className="ics201-org-name"
                                    />
                                    <input
                                        type="text"
                                        value={assignment.contact}
                                        onChange={e => updateOrgAssignment(idx, 'contact', e.target.value)}
                                        placeholder="聯絡方式"
                                        className="ics201-org-contact"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Section 5: Resources Summary */}
                {activeSection === 5 && (
                    <section className="ics201-form-section">
                        <h2>5. 資源摘要</h2>
                        <table className="ics201-resources-table">
                            <thead>
                                <tr>
                                    <th>資源類型</th>
                                    <th>數量</th>
                                    <th>位置</th>
                                    <th>預計抵達</th>
                                </tr>
                            </thead>
                            <tbody>
                                {briefing.resourcesSummary.map((resource, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <input
                                                type="text"
                                                value={resource.resourceType}
                                                onChange={e => {
                                                    const newResources = [...briefing.resourcesSummary];
                                                    newResources[idx] = { ...newResources[idx], resourceType: e.target.value };
                                                    updateField('resourcesSummary', newResources);
                                                }}
                                                placeholder="例：消防車"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={resource.quantity}
                                                onChange={e => {
                                                    const newResources = [...briefing.resourcesSummary];
                                                    newResources[idx] = { ...newResources[idx], quantity: parseInt(e.target.value) || 0 };
                                                    updateField('resourcesSummary', newResources);
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={resource.location}
                                                onChange={e => {
                                                    const newResources = [...briefing.resourcesSummary];
                                                    newResources[idx] = { ...newResources[idx], location: e.target.value };
                                                    updateField('resourcesSummary', newResources);
                                                }}
                                                placeholder="位置"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={resource.eta || ''}
                                                onChange={e => {
                                                    const newResources = [...briefing.resourcesSummary];
                                                    newResources[idx] = { ...newResources[idx], eta: e.target.value };
                                                    updateField('resourcesSummary', newResources);
                                                }}
                                                placeholder="已到達"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button
                            type="button"
                            className="ics201-add-btn"
                            onClick={() => {
                                updateField('resourcesSummary', [
                                    ...briefing.resourcesSummary,
                                    { resourceType: '', quantity: 0, location: '' },
                                ]);
                            }}
                        >
                            + 新增資源
                        </button>
                    </section>
                )}
            </div>

            {/* Footer */}
            <footer className="ics201-footer">
                <div className="ics201-footer-left">
                    <Clock size={14} />
                    <span>自動儲存於 {new Date().toLocaleTimeString('zh-TW')}</span>
                </div>
                <div className="ics201-footer-right">
                    <span>ICS 201 v1.0 | NIMS Compliant</span>
                </div>
            </footer>
        </div>
    );
}
