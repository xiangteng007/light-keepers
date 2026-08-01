/**
 * MedicalTransportPage.tsx
 *
 * 醫療後送頁面 - MCI/檢傷/後送管理
 *
 * 誠實佔位頁：本頁尚未串接真實傷患/後送資料。
 * 原本此頁顯示寫死的假檢傷分類統計數字（危急2/中傷5/輕傷15/不治0），
 * 違反 DESIGN_LANGUAGE.md §0「高壓可用性 > 美觀」原則
 * （偽造生命安全相關數字可能誤導救援人員），已移除。
 * 真實檢傷分類請使用 /rescue/triage（TriagePage）。
 */
import { Construction } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';
import './MedicalTransportPage.css';

export default function MedicalTransportPage() {
    return (
        <div className="medical-transport-page">
            <div className="medical-transport-page__header">
                <h1>醫療後送</h1>
                <p>大量傷患事件處理、檢傷分類、後送調度</p>
            </div>

            <div className="medical-transport-page__body">
                <EmptyState
                    icon={Construction}
                    title="頁面建置中"
                    description="規劃中功能：START 快速檢傷分類、後送車輛調度、鄰近醫院容量查詢。本頁尚未串接真實傷患資料，實際檢傷分類作業請使用「傷患分類」頁面（/rescue/triage）。"
                />
            </div>
        </div>
    );
}
