/**
 * START Triage Algorithm
 * 
 * Simple Triage and Rapid Treatment (START) protocol
 * for mass casualty incident patient triage.
 */

export type TriageCategory = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';

export interface TriageResult {
    category: TriageCategory;
    code: string;
    description: string;
    priority: number;
    color: string;
    actionRequired: string;
}

export interface TriageAssessment {
    canWalk: boolean;
    isBreathing: boolean;
    respiratoryRate?: number; // breaths per minute
    radialPulse: boolean;
    followsCommands: boolean;
}

/**
 * Triage category definitions
 */
export const TRIAGE_CATEGORIES: Record<TriageCategory, TriageResult> = {
    RED: {
        category: 'RED',
        code: 'IMMEDIATE',
        description: '立即處理 - 生命危急，需立即醫療處置',
        priority: 1,
        color: '#ef4444',
        actionRequired: '立即送醫，優先救治',
    },
    YELLOW: {
        category: 'YELLOW',
        code: 'DELAYED',
        description: '延遲處理 - 傷勢嚴重但可暫時等待',
        priority: 2,
        color: '#eab308',
        actionRequired: '觀察等待，次優先救治',
    },
    GREEN: {
        category: 'GREEN',
        code: 'MINOR',
        description: '輕傷 - 可自行移動，無立即生命危險',
        priority: 3,
        color: '#22c55e',
        actionRequired: '送至輕傷區，延後處理',
    },
    BLACK: {
        category: 'BLACK',
        code: 'EXPECTANT',
        description: '無生命跡象 - 死亡或預後極差',
        priority: 4,
        color: '#18181b',
        actionRequired: '記錄並移至指定區域',
    },
};

/**
 * Execute START Triage Algorithm
 * 
 * @param assessment - Patient assessment data
 * @returns Triage result with category and actions
 */
export function executeSTARTTriage(assessment: TriageAssessment): TriageResult {
    // Step 1: Can the patient walk?
    if (assessment.canWalk) {
        return TRIAGE_CATEGORIES.GREEN;
    }

    // Step 2: Is the patient breathing?
    if (!assessment.isBreathing) {
        // Attempt to open airway (simulated by checking again)
        return TRIAGE_CATEGORIES.BLACK;
    }

    // Step 3: Check respiratory rate
    if (assessment.respiratoryRate !== undefined) {
        if (assessment.respiratoryRate > 30 || assessment.respiratoryRate < 10) {
            return TRIAGE_CATEGORIES.RED;
        }
    }

    // Step 4: Check perfusion (radial pulse)
    if (!assessment.radialPulse) {
        return TRIAGE_CATEGORIES.RED;
    }

    // Step 5: Check mental status (follows commands)
    if (!assessment.followsCommands) {
        return TRIAGE_CATEGORIES.RED;
    }

    // Patient is stable but needs attention
    return TRIAGE_CATEGORIES.YELLOW;
}

/**
 * Get triage guidance questions for UI
 */
export function getTriageQuestions(): { id: keyof TriageAssessment; question: string; help: string }[] {
    return [
        {
            id: 'canWalk',
            question: '傷患能否自行行走?',
            help: '觀察傷患是否能在無協助下站立並行走',
        },
        {
            id: 'isBreathing',
            question: '傷患是否有呼吸?',
            help: '觀察胸部起伏或感受氣息',
        },
        {
            id: 'respiratoryRate',
            question: '每分鐘呼吸次數?',
            help: '計算 30 秒呼吸次數乘以 2',
        },
        {
            id: 'radialPulse',
            question: '是否能摸到橈動脈?',
            help: '在手腕內側觸摸脈搏',
        },
        {
            id: 'followsCommands',
            question: '傷患能否遵從指令?',
            help: '請傷患做簡單動作如眨眼、握手',
        },
    ];
}

/**
 * Validate triage assessment data
 */
export function validateAssessment(assessment: Partial<TriageAssessment>): boolean {
    if (assessment.canWalk === undefined) return false;
    if (!assessment.canWalk && assessment.isBreathing === undefined) return false;
    return true;
}
</Parameter>
<parameter name="Complexity">5
