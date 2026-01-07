import React, { useState, useEffect } from 'react';
import './AttendancePage.css';

interface AttendanceRecord {
    id: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    hours?: number;
    location: string;
    method: 'gps' | 'qr';
}

export const AttendancePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'checkin' | 'history'>('checkin');
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
        }
    }, []);

    const handleCheckIn = (method: 'gps' | 'qr') => {
        const now = new Date();
        const record: AttendanceRecord = {
            id: `att-${Date.now()}`,
            date: now.toISOString().split('T')[0],
            checkIn: now.toTimeString().slice(0, 5),
            location: location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : '定位�?..',
            method
        };
        setCurrentRecord(record);
        setIsCheckedIn(true);
    };

    const handleCheckOut = () => {
        if (!currentRecord) return;

        const now = new Date();
        const checkInTime = new Date(`${currentRecord.date}T${currentRecord.checkIn}`);
        const hours = Math.round((now.getTime() - checkInTime.getTime()) / 3600000 * 10) / 10;

        const completedRecord: AttendanceRecord = {
            ...currentRecord,
            checkOut: now.toTimeString().slice(0, 5),
            hours
        };

        setRecords([completedRecord, ...records]);
        setCurrentRecord(null);
        setIsCheckedIn(false);
    };

    const getTotalHours = () => records.reduce((sum, r) => sum + (r.hours || 0), 0);

    return (
        <div className="attendance-page">
            <div className="page-header">
                <h1>�?出勤打卡</h1>
                <p>GPS / QR Code 簽到簽退</p>
            </div>

            <div className="tab-buttons">
                <button className={activeTab === 'checkin' ? 'active' : ''} onClick={() => setActiveTab('checkin')}>
                    打卡
                </button>
                <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
                    紀�?
                </button>
            </div>

            {activeTab === 'checkin' && (
                <div className="checkin-section">
                    <div className="current-time">
                        <div className="time">{new Date().toLocaleTimeString('zh-TW')}</div>
                        <div className="date">{new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>

                    {location && (
                        <div className="location-info">
                            📍 位置: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </div>
                    )}

                    {!isCheckedIn ? (
                        <div className="checkin-buttons">
                            <button className="checkin-btn gps" onClick={() => handleCheckIn('gps')}>
                                <span className="icon">📍</span>
                                <span className="label">GPS 簽到</span>
                            </button>
                            <button className="checkin-btn qr" onClick={() => handleCheckIn('qr')}>
                                <span className="icon">📱</span>
                                <span className="label">QR 掃碼簽到</span>
                            </button>
                        </div>
                    ) : (
                        <div className="checked-in-status">
                            <div className="status-badge">�?已簽�?/div>
                            <div className="checkin-time">
                                簽到時間: {currentRecord?.checkIn}
                            </div>
                            <button className="checkout-btn" onClick={handleCheckOut}>
                                簽退
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="history-section">
                    <div className="stats-summary">
                        <div className="stat-card">
                            <div className="stat-value">{records.length}</div>
                            <div className="stat-label">出勤次數</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{getTotalHours()}h</div>
                            <div className="stat-label">總工�?/div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{records.length > 0 ? (getTotalHours() / records.length).toFixed(1) : 0}h</div>
                            <div className="stat-label">平均工時</div>
                        </div>
                    </div>

                    <div className="records-list">
                        {records.map(record => (
                            <div key={record.id} className="record-item">
                                <div className="record-date">{record.date}</div>
                                <div className="record-times">
                                    <span className="time-in">🟢 {record.checkIn}</span>
                                    <span className="time-out">🔴 {record.checkOut || '-'}</span>
                                </div>
                                <div className="record-hours">{record.hours}h</div>
                                <div className={`record-method ${record.method}`}>{record.method.toUpperCase()}</div>
                            </div>
                        ))}
                        {records.length === 0 && (
                            <div className="no-records">尚無出勤記錄</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
