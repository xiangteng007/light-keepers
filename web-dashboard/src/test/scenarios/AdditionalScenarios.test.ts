/**
 * Additional Disaster Response Scenario E2E Test Specs
 * 
 * 城市倒塌場景 (Urban Collapse) & 避難所場景 (Shelter Management) E2E 流程定義
 * 
 * 這些測試場景利用既有的模組：
 * - mission-sessions: 任務場次管理
 * - task-dispatch: 任務派遣
 * - triage: 傷患檢傷
 * - shelters: 避難所管理
 * - resources: 物資管理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ==================== 場景定義 ====================

interface ScenarioStep {
    id: string;
    actor: string;
    action: string;
    expectedResult: string;
    apiEndpoint?: string;
    requiredLevel?: number;
}

interface DisasterScenario {
    name: string;
    description: string;
    actors: string[];
    minimalDataSet: Record<string, unknown>;
    steps: ScenarioStep[];
    acceptanceCriteria: string[];
}

// ==================== 城市倒塌場景 ====================

const urbanCollapseScenario: DisasterScenario = {
    name: '城市倒塌場景 E2E',
    description: '地震導致建築物倒塌，啟動都市搜救任務',
    actors: ['指揮官 (Level 4)', '結構評估員 (Level 3)', '搜救隊 (Level 2)', '醫護人員 (Level 2)', '後勤支援 (Level 1)'],
    minimalDataSet: {
        missionType: 'URBAN_COLLAPSE',
        location: { lat: 25.0330, lng: 121.5654, name: '台北市信義區' },
        affectedBuildings: 3,
        estimatedTrapped: 15,
        structuralRisk: 'high',
    },
    steps: [
        {
            id: 'UC-01',
            actor: '指揮官',
            action: '建立都市搜救任務場次',
            expectedResult: '任務場次建立成功，啟動緊急應變機制',
            apiEndpoint: 'POST /api/v1/missions',
            requiredLevel: 4,
        },
        {
            id: 'UC-02',
            actor: '結構評估員',
            action: '建築物結構安全評估',
            expectedResult: '標記建築物安全等級（紅/黃/綠）',
            apiEndpoint: 'POST /api/v1/structural-assessment',
            requiredLevel: 3,
        },
        {
            id: 'UC-03',
            actor: '指揮官',
            action: '劃定搜救區域與優先順序',
            expectedResult: '生成搜救任務，依危險等級排序',
            apiEndpoint: 'POST /api/v1/task-dispatch/tasks',
            requiredLevel: 4,
        },
        {
            id: 'UC-04',
            actor: '搜救隊',
            action: '進入倒塌區域搜救',
            expectedResult: '任務開始，位置追蹤啟動',
            apiEndpoint: 'POST /api/v1/task-dispatch/tasks/:id/start',
            requiredLevel: 2,
        },
        {
            id: 'UC-05',
            actor: '搜救隊',
            action: '發現受困者並救出',
            expectedResult: '受困者記錄建立，狀態更新',
            apiEndpoint: 'POST /api/v1/reunification/reports',
            requiredLevel: 2,
        },
        {
            id: 'UC-06',
            actor: '醫護人員',
            action: '現場檢傷與穩定傷患',
            expectedResult: 'START 分級完成，後送優先序確定',
            apiEndpoint: 'POST /api/v1/triage/victims',
            requiredLevel: 2,
        },
        {
            id: 'UC-07',
            actor: '後勤支援',
            action: '調度物資與設備',
            expectedResult: '物資運送任務建立',
            apiEndpoint: 'POST /api/v1/resources/dispatch',
            requiredLevel: 1,
        },
        {
            id: 'UC-08',
            actor: '指揮官',
            action: '階段性結案與統計',
            expectedResult: 'SITREP 報告生成，AAR 準備',
            apiEndpoint: 'POST /api/v1/missions/:id/close',
            requiredLevel: 4,
        },
    ],
    acceptanceCriteria: [
        '建築物安全評估優先於進入搜救',
        '受困者從發現到救出全程追蹤',
        '搜救人員位置即時可見',
        '物資調度與搜救任務同步',
    ],
};

// ==================== 避難所場景 ====================

const shelterManagementScenario: DisasterScenario = {
    name: '避難所場景 E2E',
    description: '颱風期間啟動避難所收容災民',
    actors: ['避難所管理員 (Level 3)', '登記員 (Level 2)', '物資管理員 (Level 2)', '醫護人員 (Level 2)'],
    minimalDataSet: {
        missionType: 'SHELTER_MANAGEMENT',
        shelterInfo: { id: 'shelter-001', name: '信義國小', capacity: 200, currentOccupancy: 0 },
        expectedEvacuees: 150,
        supplies: { food: 500, water: 1000, blankets: 300 },
    },
    steps: [
        {
            id: 'SM-01',
            actor: '避難所管理員',
            action: '啟動避難所並設定容量',
            expectedResult: '避難所狀態更新為「開放」',
            apiEndpoint: 'POST /api/v1/shelters/:id/activate',
            requiredLevel: 3,
        },
        {
            id: 'SM-02',
            actor: '登記員',
            action: '災民入所登記',
            expectedResult: '災民建檔完成，發放識別手環',
            apiEndpoint: 'POST /api/v1/shelters/:id/check-in',
            requiredLevel: 2,
        },
        {
            id: 'SM-03',
            actor: '醫護人員',
            action: '入所健康篩檢',
            expectedResult: '特殊需求標記（長者、孕婦、慢性病）',
            apiEndpoint: 'POST /api/v1/shelters/:id/health-screening',
            requiredLevel: 2,
        },
        {
            id: 'SM-04',
            actor: '物資管理員',
            action: '物資盤點與發放',
            expectedResult: '物資庫存更新，發放記錄建立',
            apiEndpoint: 'POST /api/v1/resources/distribute',
            requiredLevel: 2,
        },
        {
            id: 'SM-05',
            actor: '避難所管理員',
            action: '床位分配',
            expectedResult: '災民分配至指定區域',
            apiEndpoint: 'POST /api/v1/shelters/:id/assign-bed',
            requiredLevel: 3,
        },
        {
            id: 'SM-06',
            actor: '登記員',
            action: '家屬查詢服務',
            expectedResult: '查詢碼系統響應查詢',
            apiEndpoint: 'GET /api/v1/reunification/query/:code',
            requiredLevel: 2,
        },
        {
            id: 'SM-07',
            actor: '避難所管理員',
            action: '每日狀況回報',
            expectedResult: 'SITREP 自動彙整',
            apiEndpoint: 'POST /api/v1/shelters/:id/daily-report',
            requiredLevel: 3,
        },
        {
            id: 'SM-08',
            actor: '避難所管理員',
            action: '災民離所與結案',
            expectedResult: '出所記錄完成，容量更新',
            apiEndpoint: 'POST /api/v1/shelters/:id/check-out',
            requiredLevel: 3,
        },
    ],
    acceptanceCriteria: [
        '避難所容量即時可見',
        '災民可透過查詢碼被家屬找到',
        '特殊需求者有標記與優先照護',
        '物資庫存與發放記錄完整',
    ],
};

// ==================== 複合災害場景 ====================

const multiHazardScenario: DisasterScenario = {
    name: '複合災害場景 E2E',
    description: '地震引發海嘯，多點同時應變',
    actors: ['EOC 指揮官 (Level 5)', '區域指揮官 (Level 4)', '各功能組 (Level 2-3)'],
    minimalDataSet: {
        missionType: 'MULTI_HAZARD',
        primaryHazard: 'earthquake',
        secondaryHazard: 'tsunami',
        affectedZones: ['沿海區', '都會區', '山區'],
        estimatedAffected: 5000,
    },
    steps: [
        {
            id: 'MH-01',
            actor: 'EOC 指揮官',
            action: '啟動多層級應變架構',
            expectedResult: '主任務場次建立，子任務連結',
            apiEndpoint: 'POST /api/v1/missions',
            requiredLevel: 5,
        },
        {
            id: 'MH-02',
            actor: 'EOC 指揮官',
            action: '指派區域指揮官',
            expectedResult: '指揮鏈建立完成',
            apiEndpoint: 'POST /api/v1/command-chain',
            requiredLevel: 5,
        },
        {
            id: 'MH-03',
            actor: '區域指揮官',
            action: '各區建立子任務',
            expectedResult: '沿海、都會、山區子任務建立',
            apiEndpoint: 'POST /api/v1/missions/:parentId/sub-missions',
            requiredLevel: 4,
        },
        {
            id: 'MH-04',
            actor: '各功能組',
            action: '平行執行救援、醫療、後勤',
            expectedResult: '多組任務同時推進',
            apiEndpoint: 'POST /api/v1/task-dispatch/bulk-assign',
            requiredLevel: 2,
        },
        {
            id: 'MH-05',
            actor: 'EOC 指揮官',
            action: '資源跨區調度',
            expectedResult: '資源從未受災區調往受災區',
            apiEndpoint: 'POST /api/v1/resources/cross-zone-transfer',
            requiredLevel: 5,
        },
        {
            id: 'MH-06',
            actor: '區域指揮官',
            action: '定時 SITREP 回報',
            expectedResult: '各區狀況彙整至 EOC',
            apiEndpoint: 'POST /api/v1/sitrep',
            requiredLevel: 4,
        },
        {
            id: 'MH-07',
            actor: 'EOC 指揮官',
            action: '對外公開資訊發布',
            expectedResult: 'CAP 警報發布',
            apiEndpoint: 'POST /api/v1/alerts/cap',
            requiredLevel: 5,
        },
        {
            id: 'MH-08',
            actor: 'EOC 指揮官',
            action: '整體結案與 AAR',
            expectedResult: '所有子任務關閉，AAR 報告生成',
            apiEndpoint: 'POST /api/v1/missions/:id/close',
            requiredLevel: 5,
        },
    ],
    acceptanceCriteria: [
        '多層級指揮鏈明確',
        '跨區資源調度順暢',
        'SITREP 自動彙整至上級',
        'CAP 警報符合國際標準',
    ],
};

// ==================== 測試套件 ====================

describe('Additional Disaster Scenarios E2E', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('城市倒塌場景 E2E (Urban Collapse)', () => {
        it('Scenario structure is valid', () => {
            expect(urbanCollapseScenario.steps).toHaveLength(8);
            expect(urbanCollapseScenario.actors).toHaveLength(5);
            expect(urbanCollapseScenario.acceptanceCriteria).toHaveLength(4);
        });

        it('Includes structural assessment before rescue', () => {
            const steps = urbanCollapseScenario.steps;
            const assessmentStep = steps.findIndex(s => s.action.includes('結構') || s.action.includes('評估'));
            const rescueStep = steps.findIndex(s => s.action.includes('搜救區域') || s.action.includes('進入'));
            
            expect(assessmentStep).toBeLessThan(rescueStep);
        });

        it('All critical steps have API endpoints', () => {
            const stepsWithEndpoints = urbanCollapseScenario.steps.filter(s => s.apiEndpoint);
            expect(stepsWithEndpoints.length).toBe(urbanCollapseScenario.steps.length);
        });

        it('Covers full rescue lifecycle', () => {
            const actions = urbanCollapseScenario.steps.map(s => s.action);
            expect(actions.some(a => a.includes('建立'))).toBe(true);   // Create
            expect(actions.some(a => a.includes('評估'))).toBe(true);   // Assess
            expect(actions.some(a => a.includes('搜救'))).toBe(true);   // Rescue
            expect(actions.some(a => a.includes('檢傷'))).toBe(true);   // Triage
            expect(actions.some(a => a.includes('結案'))).toBe(true);   // Close
        });
    });

    describe('避難所場景 E2E (Shelter Management)', () => {
        it('Scenario structure is valid', () => {
            expect(shelterManagementScenario.steps).toHaveLength(8);
            expect(shelterManagementScenario.actors).toHaveLength(4);
            expect(shelterManagementScenario.acceptanceCriteria).toHaveLength(4);
        });

        it('Includes check-in and check-out flow', () => {
            const actions = shelterManagementScenario.steps.map(s => s.action);
            expect(actions.some(a => a.includes('入所'))).toBe(true);
            expect(actions.some(a => a.includes('離所'))).toBe(true);
        });

        it('Includes family reunification query', () => {
            const queryStep = shelterManagementScenario.steps.find(s => 
                s.action.includes('查詢') || s.apiEndpoint?.includes('query')
            );
            expect(queryStep).toBeDefined();
        });

        it('Covers shelter lifecycle', () => {
            const actions = shelterManagementScenario.steps.map(s => s.action);
            expect(actions.some(a => a.includes('啟動'))).toBe(true);    // Activate
            expect(actions.some(a => a.includes('登記'))).toBe(true);    // Register
            expect(actions.some(a => a.includes('物資'))).toBe(true);    // Supplies
            expect(actions.some(a => a.includes('回報'))).toBe(true);    // Report
        });
    });

    describe('複合災害場景 E2E (Multi-Hazard)', () => {
        it('Scenario structure is valid', () => {
            expect(multiHazardScenario.steps).toHaveLength(8);
            expect(multiHazardScenario.actors).toHaveLength(3);
            expect(multiHazardScenario.acceptanceCriteria).toHaveLength(4);
        });

        it('Includes command chain setup', () => {
            const commandStep = multiHazardScenario.steps.find(s => 
                s.apiEndpoint?.includes('command-chain')
            );
            expect(commandStep).toBeDefined();
        });

        it('Supports cross-zone resource transfer', () => {
            const transferStep = multiHazardScenario.steps.find(s => 
                s.action.includes('跨區') || s.apiEndpoint?.includes('cross-zone')
            );
            expect(transferStep).toBeDefined();
        });

        it('Includes CAP alert publishing', () => {
            const capStep = multiHazardScenario.steps.find(s => 
                s.action.includes('CAP') || s.apiEndpoint?.includes('cap')
            );
            expect(capStep).toBeDefined();
        });
    });

    describe('Cross-Scenario Consistency', () => {
        const allScenarios = [urbanCollapseScenario, shelterManagementScenario, multiHazardScenario];

        it('All scenarios have 8 steps', () => {
            allScenarios.forEach(scenario => {
                expect(scenario.steps).toHaveLength(8);
            });
        });

        it('All scenarios define acceptance criteria', () => {
            allScenarios.forEach(scenario => {
                expect(scenario.acceptanceCriteria.length).toBeGreaterThanOrEqual(4);
            });
        });

        it('All scenarios use consistent API patterns', () => {
            allScenarios.forEach(scenario => {
                scenario.steps.forEach(step => {
                    if (step.apiEndpoint) {
                        expect(step.apiEndpoint).toMatch(/^(GET|POST|PUT|PATCH|DELETE)\s+\/api\/v1\//);
                    }
                });
            });
        });
    });
});

// Export for documentation
export { urbanCollapseScenario, shelterManagementScenario, multiHazardScenario };
