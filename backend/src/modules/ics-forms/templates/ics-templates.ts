/**
 * ICS Form Templates
 * 
 * FEMA Incident Command System standard form templates.
 * ICS-201 through ICS-215 forms for disaster response documentation.
 */

export interface ICSFormField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'checkbox' | 'signature';
    required: boolean;
    options?: string[];
    validation?: string;
}

export interface ICSFormTemplate {
    formId: string;
    name: string;
    description: string;
    sections: {
        title: string;
        fields: ICSFormField[];
    }[];
}

/**
 * ICS-201: Incident Briefing
 */
export const ICS201_TEMPLATE: ICSFormTemplate = {
    formId: 'ICS-201',
    name: 'Incident Briefing',
    description: '事件簡報表 - 用於初始事件評估和資源概述',
    sections: [
        {
            title: '事件資訊',
            fields: [
                { id: 'incidentName', label: '事件名稱', type: 'text', required: true },
                { id: 'incidentNumber', label: '事件編號', type: 'text', required: true },
                { id: 'date', label: '日期', type: 'date', required: true },
                { id: 'time', label: '時間', type: 'time', required: true },
                { id: 'location', label: '地點', type: 'text', required: true },
            ]
        },
        {
            title: '情況摘要',
            fields: [
                { id: 'objectives', label: '事件目標', type: 'textarea', required: true },
                { id: 'currentSituation', label: '當前狀況', type: 'textarea', required: true },
                { id: 'healthSafety', label: '健康與安全', type: 'textarea', required: false },
            ]
        },
        {
            title: '資源摘要',
            fields: [
                { id: 'resourcesSummary', label: '資源概述', type: 'textarea', required: true },
                { id: 'personnelCount', label: '人員數量', type: 'number', required: true },
            ]
        },
        {
            title: '簽核',
            fields: [
                { id: 'preparedBy', label: '填表人', type: 'text', required: true },
                { id: 'signature', label: '簽名', type: 'signature', required: true },
            ]
        }
    ]
};

/**
 * ICS-202: Incident Objectives
 */
export const ICS202_TEMPLATE: ICSFormTemplate = {
    formId: 'ICS-202',
    name: 'Incident Objectives',
    description: '事件目標表 - 定義事件期間的總體目標',
    sections: [
        {
            title: '事件資訊',
            fields: [
                { id: 'incidentName', label: '事件名稱', type: 'text', required: true },
                { id: 'operationalPeriod', label: '作業期間', type: 'text', required: true },
            ]
        },
        {
            title: '目標設定',
            fields: [
                { id: 'objective1', label: '目標 1', type: 'textarea', required: true },
                { id: 'objective2', label: '目標 2', type: 'textarea', required: false },
                { id: 'objective3', label: '目標 3', type: 'textarea', required: false },
            ]
        },
        {
            title: '天氣預報',
            fields: [
                { id: 'weatherForecast', label: '天氣預報', type: 'textarea', required: false },
            ]
        },
        {
            title: '安全訊息',
            fields: [
                { id: 'safetyMessage', label: '安全訊息', type: 'textarea', required: true },
            ]
        }
    ]
};

/**
 * ICS-204: Assignment List
 */
export const ICS204_TEMPLATE: ICSFormTemplate = {
    formId: 'ICS-204',
    name: 'Assignment List',
    description: '任務分配表 - 分部/團隊的任務分配',
    sections: [
        {
            title: '事件資訊',
            fields: [
                { id: 'incidentName', label: '事件名稱', type: 'text', required: true },
                { id: 'operationalPeriod', label: '作業期間', type: 'text', required: true },
                { id: 'branchName', label: '分部名稱', type: 'text', required: true },
                { id: 'divisionGroup', label: '分組/群組', type: 'text', required: true },
            ]
        },
        {
            title: '任務內容',
            fields: [
                { id: 'assignment', label: '任務說明', type: 'textarea', required: true },
                { id: 'resources', label: '指派資源', type: 'textarea', required: true },
            ]
        },
        {
            title: '通訊',
            fields: [
                { id: 'radioChannel', label: '無線電頻道', type: 'text', required: false },
                { id: 'contactInfo', label: '聯絡資訊', type: 'text', required: true },
            ]
        }
    ]
};

/**
 * ICS-214: Activity Log
 */
export const ICS214_TEMPLATE: ICSFormTemplate = {
    formId: 'ICS-214',
    name: 'Activity Log',
    description: '活動紀錄表 - 個人或單位的活動日誌',
    sections: [
        {
            title: '基本資訊',
            fields: [
                { id: 'incidentName', label: '事件名稱', type: 'text', required: true },
                { id: 'unitName', label: '單位名稱', type: 'text', required: true },
                { id: 'preparedBy', label: '填表人', type: 'text', required: true },
            ]
        },
        {
            title: '活動紀錄',
            fields: [
                { id: 'activityLog', label: '活動日誌', type: 'textarea', required: true },
            ]
        }
    ]
};

/**
 * All Available ICS Forms
 */
export const ICS_FORMS: Record<string, ICSFormTemplate> = {
    'ICS-201': ICS201_TEMPLATE,
    'ICS-202': ICS202_TEMPLATE,
    'ICS-204': ICS204_TEMPLATE,
    'ICS-214': ICS214_TEMPLATE,
};

/**
 * Get all available form IDs
 */
export function getAvailableFormIds(): string[] {
    return Object.keys(ICS_FORMS);
}

/**
 * Get form template by ID
 */
export function getFormTemplate(formId: string): ICSFormTemplate | undefined {
    return ICS_FORMS[formId];
}
