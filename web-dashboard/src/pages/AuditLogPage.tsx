/**
 * AuditLogPage.tsx
 * 
 * 審計日誌頁面 - Core Domain
 * 功能：系統操作記錄、安全審計、用戶行為追蹤
 */
import { useState } from 'react';
import { ScrollText, Search, Filter, Download, User, Clock, Eye, Shield, AlertTriangle } from 'lucide-react';
import './AuditLogPage.css';

interface AuditEntry {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    resource: string;
    ip: string;
    status: 'success' | 'warning' | 'error';
    details: string;
}

const MOCK_LOGS: AuditEntry[] = [
    { id: 'AUD-001', timestamp: '2026-01-12 10:45:32', user: 'admin@lightkeepers.org', action: 'LOGIN', resource: '系統登入', ip: '192.168.1.100', status: 'success', details: '雙因素認證通過' },
    { id: 'AUD-002', timestamp: '2026-01-12 10:42:15', user: 'manager@lightkeepers.org', action: 'UPDATE', resource: '志工資料', ip: '192.168.1.105', status: 'success', details: '更新志工 ID:V-001 的聯絡資訊' },
    { id: 'AUD-003', timestamp: '2026-01-12 10:38:50', user: 'unknown', action: 'LOGIN_FAILED', resource: '系統登入', ip: '203.45.67.89', status: 'error', details: '密碼錯誤 (第3次嘗試)' },
    { id: 'AUD-004', timestamp: '2026-01-12 10:35:22', user: 'operator@lightkeepers.org', action: 'CREATE', resource: '任務派遣', ip: '192.168.1.110', status: 'success', details: '建立任務 TASK-456' },
    { id: 'AUD-005', timestamp: '2026-01-12 10:30:00', user: 'admin@lightkeepers.org', action: 'DELETE', resource: '過期資料', ip: '192.168.1.100', status: 'warning', details: '刪除 30 天前的暫存檔案' },
];

export default function AuditLogPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <Eye size={14} className="status-icon success" />;
            case 'warning': return <AlertTriangle size={14} className="status-icon warning" />;
            case 'error': return <Shield size={14} className="status-icon error" />;
            default: return null;
        }
    };

    return (
        <div className="audit-page">
            <header className="audit-header">
                <div className="header-title">
                    <ScrollText size={24} />
                    <div>
                        <h1>審計日誌</h1>
                        <p>系統操作記錄與安全審計</p>
                    </div>
                </div>
                <button className="btn-export">
                    <Download size={16} />
                    匯出日誌
                </button>
            </header>

            <div className="audit-toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="搜尋使用者、操作、資源..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                    <option value="all">所有操作</option>
                    <option value="LOGIN">登入</option>
                    <option value="CREATE">建立</option>
                    <option value="UPDATE">更新</option>
                    <option value="DELETE">刪除</option>
                </select>
                <input type="date" className="date-picker" />
            </div>

            <div className="audit-table">
                <table>
                    <thead>
                        <tr>
                            <th>時間戳</th>
                            <th>使用者</th>
                            <th>操作</th>
                            <th>資源</th>
                            <th>IP 位址</th>
                            <th>狀態</th>
                            <th>詳情</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_LOGS.map(log => (
                            <tr key={log.id} className={log.status}>
                                <td className="timestamp">
                                    <Clock size={12} />
                                    {log.timestamp}
                                </td>
                                <td className="user">
                                    <User size={12} />
                                    {log.user}
                                </td>
                                <td>
                                    <span className={`action-badge ${log.action.toLowerCase()}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td>{log.resource}</td>
                                <td className="ip">{log.ip}</td>
                                <td>
                                    <span className={`status-badge ${log.status}`}>
                                        {getStatusIcon(log.status)}
                                        {log.status}
                                    </span>
                                </td>
                                <td className="details">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
