/**
 * widgets/offline/OfflineWidgets.tsx
 *
 * Offline hub: sync status, pending queue and mesh network.
 */

export const SyncStatusWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>● 上線</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>網路狀態</div>
        </div>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#C39B6F' }}>3</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>待同步</div>
        </div>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>10:35</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>最後同步</div>
        </div>
    </div>
);

export const PendingQueueWidget = () => (
    <div style={{ height: '100%', padding: '8px', overflow: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>待同步操作</div>
        {[
            { action: '新增通報 #1234', time: '10:32', size: '1.2KB' },
            { action: '更新任務狀態', time: '10:30', size: '0.5KB' },
            { action: '上傳照片', time: '10:28', size: '3.4MB' },
        ].map((q, i) => (
            <div key={i} style={{ padding: '10px', marginBottom: '6px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{q.action}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{q.time}</div>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{q.size}</span>
            </div>
        ))}
    </div>
);

export const MeshNetworkWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>P2P 網路</div>
        <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>2 個節點連線中</div>
    </div>
);
