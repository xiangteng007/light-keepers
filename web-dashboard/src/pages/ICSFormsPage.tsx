/**
 * ICSFormsPage.tsx
 * 
 * ICS表單目錄頁面 - 顯示所有可用的ICS表單
 */
import { Link } from 'react-router-dom';
import './placeholder-pages.css';

const ICS_FORMS = [
    { id: '201', name: 'ICS 201 - 事件簡報', description: '初始事件簡報、資源概況、組織圖', path: '/ics/201', status: '可用' },
    { id: '202', name: 'ICS 202 - 事件目標', description: '行動週期目標設定', path: '/ics', status: '開發中' },
    { id: '203', name: 'ICS 203 - 組織架構圖', description: '指揮架構及人員配置', path: '/ics', status: '開發中' },
    { id: '204', name: 'ICS 204 - 任務分派', description: '各分組任務指派', path: '/ics', status: '開發中' },
    { id: '205', name: 'ICS 205 - 通訊計畫', description: '無線電頻道、呼號分配', path: '/ics/205', status: '可用' },
    { id: '206', name: 'ICS 206 - 醫療計畫', description: '醫療資源及後送路線', path: '/ics', status: '開發中' },
    { id: '207', name: 'ICS 207 - 組織架構圖', description: '事件組織圖', path: '/ics', status: '開發中' },
    { id: '208', name: 'ICS 208 - 安全信息', description: '現場安全注意事項', path: '/ics', status: '開發中' },
    { id: '209', name: 'ICS 209 - 狀況摘要', description: '事件綜合狀況報告', path: '/ics', status: '開發中' },
    { id: '214', name: 'ICS 214 - 活動日誌', description: '單元/人員活動記錄', path: '/ics', status: '開發中' },
];

export default function ICSFormsPage() {
    return (
        <div className="placeholder-page">
            <h1 className="placeholder-page__title">📋 ICS 表單</h1>
            <p className="placeholder-page__subtitle">
                事件指揮系統標準表單 (Incident Command System Forms)
            </p>

            <div className="placeholder-page__form-grid">
                {ICS_FORMS.map((form) => (
                    <Link
                        key={form.id}
                        to={form.path}
                        className={`placeholder-page__form-link ${
                            form.status === '可用' 
                                ? 'placeholder-page__form-link--available' 
                                : 'placeholder-page__form-link--disabled'
                        }`}
                    >
                        <div className="placeholder-page__form-header">
                            <span className={`placeholder-page__form-name ${
                                form.status !== '可用' ? 'placeholder-page__form-name--disabled' : ''
                            }`}>
                                {form.name}
                            </span>
                            <span className={`placeholder-page__form-status ${
                                form.status === '可用' 
                                    ? 'placeholder-page__form-status--available' 
                                    : 'placeholder-page__form-status--dev'
                            }`}>
                                {form.status}
                            </span>
                        </div>
                        <p className="placeholder-page__form-description">
                            {form.description}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
