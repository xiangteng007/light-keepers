/**
 * ICS205CommsPage.tsx
 *
 * ICS Form 205 - Incident Radio Communications Plan
 * Per Expert Council Navigation Design §7.1
 *
 * Covers:
 * - Radio frequencies and channels
 * - Communication assignments
 * - Special instructions
 *
 * R3a redesign: Detail archetype (DESIGN_LANGUAGE.md §7.2) — this is a form
 * page with no clear list/board/map shape, so it uses the detail skeleton:
 * page-header (back | h1 | action group ≤3) → segmented panels. Data layer
 * (plan state, updateField/updateChannel/addChannel/removeChannel,
 * handleSave incl. its known-TODO alert, handlePrint) is unchanged — this
 * pass only rebuilds markup/styling to design-system components + tokens.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
// 保留 lucide（R5/T6 誠實清單）：Save（儲存）、Printer（列印）、
// Share2（分享）、Trash2（刪除）
import { Save, Printer, Share2, Trash2 } from 'lucide-react';
import { RadioIcon, ChevronLeftIcon, PlusIcon } from '../../design-system/icons';
import { Button, InputField } from '../../design-system';
import { createLogger } from '../../utils/logger';
import './ICS205CommsPage.css';

const logger = createLogger('ICS205');

interface RadioChannel {
    id: string;
    zone: string;
    channelName: string;
    function: string;
    frequency: string;
    mode: 'A' | 'D' | 'M'; // Analog, Digital, Mixed
    assignment: string;
    remarks: string;
}

interface CommsPlan {
    incidentName: string;
    dateTimePrepared: string;
    operationalPeriod: {
        from: string;
        to: string;
    };
    basicLocalComms: string;
    preparedBy: string;
    channels: RadioChannel[];
    specialInstructions: string;
}

const INITIAL_PLAN: CommsPlan = {
    incidentName: '',
    dateTimePrepared: new Date().toISOString().slice(0, 16),
    operationalPeriod: {
        from: '',
        to: '',
    },
    basicLocalComms: '',
    preparedBy: '',
    channels: [
        {
            id: '1',
            zone: '',
            channelName: 'Command',
            function: '指揮頻道',
            frequency: '',
            mode: 'D',
            assignment: 'IC, Section Chiefs',
            remarks: '',
        },
        {
            id: '2',
            zone: '',
            channelName: 'Tactical 1',
            function: '作戰頻道',
            frequency: '',
            mode: 'D',
            assignment: 'Operations',
            remarks: '',
        },
        {
            id: '3',
            zone: '',
            channelName: 'Logistics',
            function: '後勤頻道',
            frequency: '',
            mode: 'A',
            assignment: 'Logistics Section',
            remarks: '',
        },
    ],
    specialInstructions: '',
};

export default function ICS205CommsPage() {
    const [plan, setPlan] = useState<CommsPlan>(INITIAL_PLAN);

    const updateField = <K extends keyof CommsPlan>(
        field: K,
        value: CommsPlan[K]
    ) => {
        setPlan(prev => ({ ...prev, [field]: value }));
    };

    const updateChannel = (id: string, field: keyof RadioChannel, value: string) => {
        const newChannels = plan.channels.map(ch =>
            ch.id === id ? { ...ch, [field]: value } : ch
        );
        updateField('channels', newChannels);
    };

    const addChannel = () => {
        const newId = (plan.channels.length + 1).toString();
        updateField('channels', [
            ...plan.channels,
            {
                id: newId,
                zone: '',
                channelName: '',
                function: '',
                frequency: '',
                mode: 'D',
                assignment: '',
                remarks: '',
            },
        ]);
    };

    const removeChannel = (id: string) => {
        updateField('channels', plan.channels.filter(ch => ch.id !== id));
    };

    const handleSave = () => {
        // TODO: wire to backend once ICS 205 persistence API exists.
        logger.debug('Saving ICS 205:', plan);
        alert('ICS 205 已儲存');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="ics205-page">
            {/* Page header (Detail archetype §7.2: back | h1 | action group ≤3) */}
            <header className="ics205-header">
                <div className="ics205-header-left">
                    <Link to="/ics" className="ics205-back">
                        <ChevronLeftIcon size={20} aria-hidden="true" />
                        <span>ICS 儀表板</span>
                    </Link>
                    <div className="ics205-title">
                        <RadioIcon size={24} className="ics205-title-icon" aria-hidden="true" />
                        <div>
                            <h1>ICS 205 - 通訊計畫</h1>
                            <p>Incident Radio Communications Plan</p>
                        </div>
                    </div>
                </div>
                <div className="ics205-actions">
                    <Button variant="secondary" size="sm" icon={<Printer size={16} />} onClick={handlePrint}>
                        列印
                    </Button>
                    <Button variant="secondary" size="sm" icon={<Share2 size={16} />}>
                        分享
                    </Button>
                    <Button variant="primary" size="sm" icon={<Save size={16} />} onClick={handleSave}>
                        儲存
                    </Button>
                </div>
            </header>

            {/* Form Content */}
            <div className="ics205-content">
                {/* Basic Info */}
                <section className="ics205-section">
                    <h2>1. 基本資訊</h2>
                    <div className="ics205-form-grid">
                        <InputField
                            label="事件名稱"
                            id="incidentName"
                            type="text"
                            value={plan.incidentName}
                            onChange={e => updateField('incidentName', e.target.value)}
                            placeholder="例：颱風蘇力救災行動"
                            fullWidth
                        />
                        <InputField
                            label="製作日期時間"
                            id="dateTimePrepared"
                            type="datetime-local"
                            value={plan.dateTimePrepared}
                            onChange={e => updateField('dateTimePrepared', e.target.value)}
                            fullWidth
                        />
                        <InputField
                            label="作業期間起始"
                            id="operationalPeriodFrom"
                            type="datetime-local"
                            value={plan.operationalPeriod.from}
                            onChange={e => updateField('operationalPeriod', {
                                ...plan.operationalPeriod,
                                from: e.target.value,
                            })}
                            fullWidth
                        />
                        <InputField
                            label="作業期間結束"
                            id="operationalPeriodTo"
                            type="datetime-local"
                            value={plan.operationalPeriod.to}
                            onChange={e => updateField('operationalPeriod', {
                                ...plan.operationalPeriod,
                                to: e.target.value,
                            })}
                            fullWidth
                        />
                    </div>
                </section>

                {/* Basic Local Communications */}
                <section className="ics205-section">
                    <h2>2. 基礎地區通訊資訊</h2>
                    <div className="ics205-field full-width">
                        <label htmlFor="basicLocalComms">區域通訊概況</label>
                        <textarea
                            id="basicLocalComms"
                            value={plan.basicLocalComms}
                            onChange={e => updateField('basicLocalComms', e.target.value)}
                            rows={3}
                            placeholder="描述當地通訊基礎設施狀態、可用的電信服務、備援通訊方式等..."
                        />
                    </div>
                </section>

                {/* Radio Frequency Assignments */}
                <section className="ics205-section">
                    <div className="ics205-section-header">
                        <h2>3. 無線電頻率分配</h2>
                        <Button variant="secondary" size="sm" icon={<PlusIcon size={16} aria-hidden="true" />} onClick={addChannel}>
                            新增頻道
                        </Button>
                    </div>

                    <div className="ics205-table-container">
                        <table className="ics205-channels-table">
                            <thead>
                                <tr>
                                    <th>Zone</th>
                                    <th>頻道名稱</th>
                                    <th>功能</th>
                                    <th>頻率/Tone</th>
                                    <th>模式</th>
                                    <th>分配單位</th>
                                    <th>備註</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {plan.channels.map(channel => (
                                    <tr key={channel.id}>
                                        <td>
                                            <input
                                                type="text"
                                                value={channel.zone}
                                                onChange={e => updateChannel(channel.id, 'zone', e.target.value)}
                                                placeholder="-"
                                                aria-label="Zone"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={channel.channelName}
                                                onChange={e => updateChannel(channel.id, 'channelName', e.target.value)}
                                                aria-label="頻道名稱"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={channel.function}
                                                onChange={e => updateChannel(channel.id, 'function', e.target.value)}
                                                aria-label="功能"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={channel.frequency}
                                                onChange={e => updateChannel(channel.id, 'frequency', e.target.value)}
                                                placeholder="MHz"
                                                aria-label="頻率"
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={channel.mode}
                                                onChange={e => updateChannel(channel.id, 'mode', e.target.value)}
                                                aria-label="通訊模式"
                                            >
                                                <option value="A">A (類比)</option>
                                                <option value="D">D (數位)</option>
                                                <option value="M">M (混合)</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={channel.assignment}
                                                onChange={e => updateChannel(channel.id, 'assignment', e.target.value)}
                                                aria-label="分配單位"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={channel.remarks}
                                                onChange={e => updateChannel(channel.id, 'remarks', e.target.value)}
                                                aria-label="備註"
                                            />
                                        </td>
                                        <td>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                className="ics205-delete-btn"
                                                onClick={() => removeChannel(channel.id)}
                                                aria-label="刪除頻道"
                                                title="刪除"
                                                icon={<Trash2 size={14} />}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Special Instructions */}
                <section className="ics205-section">
                    <h2>4. 特殊指示</h2>
                    <div className="ics205-field full-width">
                        <label htmlFor="specialInstructions">通訊規則與限制</label>
                        <textarea
                            id="specialInstructions"
                            value={plan.specialInstructions}
                            onChange={e => updateField('specialInstructions', e.target.value)}
                            rows={4}
                            placeholder="例：所有通訊需使用呼號、禁止明碼傳送位置資訊、緊急呼叫優先等..."
                        />
                    </div>
                </section>

                {/* Prepared By */}
                <section className="ics205-section">
                    <div className="ics205-form-grid">
                        <InputField
                            label="製作人 (Communications Unit Leader)"
                            id="preparedBy"
                            type="text"
                            value={plan.preparedBy}
                            onChange={e => updateField('preparedBy', e.target.value)}
                            placeholder="姓名 / 職稱"
                            fullWidth
                        />
                    </div>
                </section>
            </div>

            {/* Footer */}
            <footer className="ics205-footer">
                <div className="ics205-footer-left">
                    <span>ICS 205 v1.0 | NIMS Compliant</span>
                </div>
                <div className="ics205-footer-right">
                    <span>{plan.channels.length} 頻道已配置</span>
                </div>
            </footer>
        </div>
    );
}
