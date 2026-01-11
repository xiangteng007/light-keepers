/**
 * ReunificationPage.tsx
 * 
 * 家庭團聚頁面 - Community Domain
 * 功能：失蹤人口登記、尋人系統、配對結果
 */
import { useState } from 'react';
import {
    Home, Users, Search, MapPin, Phone, Calendar,
    CheckCircle, AlertCircle, Clock, Plus, Filter
} from 'lucide-react';
import './ReunificationPage.css';

interface MissingPerson {
    id: string;
    name: string;
    age: number;
    gender: string;
    lastSeen: string;
    location: string;
    description: string;
    photo?: string;
    status: 'missing' | 'found' | 'reunited';
    reportedBy: string;
    reportedAt: string;
    contact: string;
}

const MOCK_CASES: MissingPerson[] = [
    { id: 'MP-001', name: '王小明', age: 8, gender: '男', lastSeen: '2026-01-11 14:30', location: '信義區市政府站', description: '紅色外套、藍色背包', status: 'missing', reportedBy: '王媽媽', reportedAt: '2026-01-11 15:00', contact: '0912-345-678' },
    { id: 'MP-002', name: '李阿姨', age: 72, gender: '女', lastSeen: '2026-01-11 10:00', location: '大安公園', description: '灰色毛衣、行動不便', status: 'found', reportedBy: '李先生', reportedAt: '2026-01-11 11:30', contact: '0923-456-789' },
    { id: 'MP-003', name: '陳小華', age: 12, gender: '女', lastSeen: '2026-01-10 16:00', location: '士林夜市', description: '學校制服', status: 'reunited', reportedBy: '陳爸爸', reportedAt: '2026-01-10 18:00', contact: '0934-567-890' },
];

export default function ReunificationPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showForm, setShowForm] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'reunited': return '#22c55e';
            case 'found': return '#3B82F6';
            default: return '#ef4444';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'reunited': return '已團聚';
            case 'found': return '已尋獲';
            default: return '尋找中';
        }
    };

    const filteredCases = MOCK_CASES.filter(c =>
        (filterStatus === 'all' || c.status === filterStatus) &&
        (c.name.includes(searchTerm) || c.location.includes(searchTerm))
    );

    return (
        <div className="reunification-page">
            <header className="reunification-header">
                <div className="header-content">
                    <Home size={28} className="header-icon" />
                    <div>
                        <h1>家庭團聚中心</h1>
                        <p>災後失蹤人口登記與尋人配對系統</p>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat missing">
                        <AlertCircle size={16} />
                        <span>{MOCK_CASES.filter(c => c.status === 'missing').length}</span>
                        <label>尋找中</label>
                    </div>
                    <div className="stat found">
                        <Clock size={16} />
                        <span>{MOCK_CASES.filter(c => c.status === 'found').length}</span>
                        <label>已尋獲</label>
                    </div>
                    <div className="stat reunited">
                        <CheckCircle size={16} />
                        <span>{MOCK_CASES.filter(c => c.status === 'reunited').length}</span>
                        <label>已團聚</label>
                    </div>
                </div>
            </header>

            <div className="reunification-toolbar">
                <div className="search-section">
                    <div className="search-input">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="搜尋姓名或地點..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">所有狀態</option>
                        <option value="missing">尋找中</option>
                        <option value="found">已尋獲</option>
                        <option value="reunited">已團聚</option>
                    </select>
                </div>
                <button className="btn-report" onClick={() => setShowForm(true)}>
                    <Plus size={16} />
                    通報失蹤
                </button>
            </div>

            <div className="cases-grid">
                {filteredCases.map(person => (
                    <div key={person.id} className={`case-card ${person.status}`}>
                        <div className="case-header">
                            <div className="case-photo">
                                <Users size={32} />
                            </div>
                            <div className="case-info">
                                <h3>{person.name}</h3>
                                <p>{person.age}歲 · {person.gender}</p>
                            </div>
                            <span className="case-status" style={{ color: getStatusColor(person.status) }}>
                                {getStatusLabel(person.status)}
                            </span>
                        </div>
                        <div className="case-details">
                            <div className="detail-row">
                                <MapPin size={14} />
                                <span>最後位置：{person.location}</span>
                            </div>
                            <div className="detail-row">
                                <Calendar size={14} />
                                <span>最後出現：{person.lastSeen}</span>
                            </div>
                            <div className="detail-row">
                                <span className="description">特徵：{person.description}</span>
                            </div>
                        </div>
                        <div className="case-contact">
                            <Phone size={14} />
                            <span>聯絡人：{person.reportedBy}</span>
                            <a href={`tel:${person.contact}`}>{person.contact}</a>
                        </div>
                        <div className="case-actions">
                            <button className="btn-primary">提供線索</button>
                            {person.status === 'missing' && (
                                <button className="btn-secondary">標記尋獲</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="report-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>通報失蹤人口</h2>
                        <form>
                            <div className="form-row">
                                <input type="text" placeholder="姓名 *" required />
                                <input type="number" placeholder="年齡" />
                            </div>
                            <div className="form-row">
                                <select>
                                    <option value="">性別</option>
                                    <option value="male">男</option>
                                    <option value="female">女</option>
                                </select>
                                <input type="text" placeholder="最後出現地點 *" required />
                            </div>
                            <textarea placeholder="外觀特徵描述"></textarea>
                            <div className="form-row">
                                <input type="text" placeholder="通報人姓名" />
                                <input type="tel" placeholder="聯絡電話 *" required />
                            </div>
                            <div className="form-actions">
                                <button type="button" onClick={() => setShowForm(false)}>取消</button>
                                <button type="submit" className="btn-submit">送出通報</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
