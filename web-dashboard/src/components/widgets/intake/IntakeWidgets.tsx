/**
 * widgets/intake/IntakeWidgets.tsx
 *
 * Disaster report intake: forms, tips and recent submissions.
 */
import { EditIcon, InfoIcon, LocationIcon, SirenIcon } from '../../../design-system/icons';

export const IntakeFormWidget = () => (
    <div style={{ height: '100%', padding: '16px', overflow: 'auto' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <EditIcon size={16} aria-hidden="true" />
            災情通報表單
        </div>
        <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>災情類型</label>
            <select style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>
                <option>淹水</option>
                <option>土石流</option>
                <option>建物倒塌</option>
                <option>其他</option>
            </select>
        </div>
        <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>地點描述</label>
            <input type="text" placeholder="請輸入地點" style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>災情描述</label>
            <textarea placeholder="請描述災情狀況..." rows={4} style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.3)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', resize: 'none' }} />
        </div>
        <button style={{ width: '100%', padding: '12px', background: 'var(--accent-gold)', border: 'none', borderRadius: '6px', color: '#1a1f2e', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            送出通報
        </button>
    </div>
);

export const IntakeTipsWidget = () => (
    <div style={{ height: '100%', padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <InfoIcon size={14} aria-hidden="true" />
            通報提示
        </div>
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li>請盡量提供精確的地址或GPS座標</li>
            <li>拍照時請注意自身安全</li>
            <li>若有人員受困，請同時撥打119</li>
            <li>通報後請保持手機暢通</li>
        </ul>
    </div>
);

export const RecentIntakesWidget = () => (
    <div style={{ height: '100%', padding: '8px', overflow: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>近期通報</div>
        {[
            { id: '#1234', type: '淹水', location: '信義區', time: '10:30' },
            { id: '#1233', type: '土石流', location: '北投區', time: '10:15' },
        ].map((r, i) => (
            <div key={i} style={{ padding: '10px', marginBottom: '6px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}><span className="u-mono">{r.id}</span> {r.type}</span>
                    <span className="u-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.time}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <LocationIcon size={12} aria-hidden="true" />
                    {r.location}
                </div>
            </div>
        ))}
    </div>
);

export const ReportFormWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
        <div style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '20px', fontWeight: 600 }}>災情通報表單</div>
        {['災情類型', '地點', '影響範圍', '描述'].map((field, i) => (
            <div key={i} style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{field}</label>
                {i === 3 ? (
                    <textarea style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.2)', borderRadius: '6px', color: 'var(--text-primary)', minHeight: '100px' }} placeholder={`請輸入${field}...`} />
                ) : (
                    <input type="text" style={{ width: '100%', padding: '10px', background: 'rgba(47, 54, 65, 0.5)', border: '1px solid rgba(195, 155, 111, 0.2)', borderRadius: '6px', color: 'var(--text-primary)' }} placeholder={`請輸入${field}...`} />
                )}
            </div>
        ))}
        <button style={{ width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <SirenIcon size={16} aria-hidden="true" />
            緊急通報
        </button>
    </div>
);

export const RecentReportsWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>近期通報</div>
        {['水災通報 - 信義區', '停電通報 - 中山區', '道路封閉 - 內湖區'].map((report, i) => (
            <div key={i} style={{ padding: '10px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{report}</div>
        ))}
    </div>
);
