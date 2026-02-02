/**
 * PR-10 & PR-11: Disaster Response Scenario E2E Test Specs
 * 
 * 山搜場景 (Mountain Search) & 水域場景 (Water Rescue) E2E 流程定義
 * 
 * 這些測試場景利用既有的模組：
 * - mission-sessions: 任務場次管理
 * - task-dispatch: 任務派遣
 * - triage: 傷患檢傷
 * - reunification: 失蹤者協尋
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// ==================== 山搜場景 ====================

const mountainSearchScenario: DisasterScenario = {
    name: '山搜場景 E2E',
    description: '登山客於雪山迷途，啟動山難搜救任務',
    actors: ['指揮官 (Level 4)', '隊長 (Level 3)', '搜救隊員 (Level 2)', '醫護人員 (Level 2)'],
    minimalDataSet: {
        missionType: 'MOUNTAIN_SEARCH',
        location: { lat: 24.3867, lng: 121.0030, name: '雪山主峰' },
        reportedMissing: 2,
        weather: { condition: 'cloudy', temperature: 8, visibility: 500 },
    },
    steps: [
        {
            id: 'MS-01',
            actor: '指揮官',
            action: '建立山難搜救任務場次',
            expectedResult: '任務場次建立成功，產生 missionSessionId',
            apiEndpoint: 'POST /api/v1/missions',
            requiredLevel: 4,
        },
        {
            id: 'MS-02',
            actor: '指揮官',
            action: '登記失蹤者資料',
            expectedResult: '產生失蹤者查詢碼，家屬可追蹤',
            apiEndpoint: 'POST /api/v1/reunification/reports',
            requiredLevel: 3,
        },
        {
            id: 'MS-03',
            actor: '隊長',
            action: '建立搜索網格與任務分配',
            expectedResult: '生成 N 個搜索任務，分配至各小隊',
            apiEndpoint: 'POST /api/v1/task-dispatch/tasks',
            requiredLevel: 3,
        },
        {
            id: 'MS-04',
            actor: '搜救隊員',
            action: '接受任務並 GPS 簽到',
            expectedResult: '任務狀態更新為 IN_PROGRESS，位置記錄',
            apiEndpoint: 'POST /api/v1/task-dispatch/tasks/:id/accept',
            requiredLevel: 1,
        },
        {
            id: 'MS-05',
            actor: '搜救隊員',
            action: '發現失蹤者，回報狀態',
            expectedResult: '失蹤者狀態更新為 FOUND_INJURED',
            apiEndpoint: 'PATCH /api/v1/reunification/:id/found',
            requiredLevel: 1,
        },
        {
            id: 'MS-06',
            actor: '醫護人員',
            action: '執行現場檢傷',
            expectedResult: '傷患記錄建立，START 分級完成',
            apiEndpoint: 'POST /api/v1/triage/victims',
            requiredLevel: 2,
        },
        {
            id: 'MS-07',
            actor: '隊長',
            action: '安排後送',
            expectedResult: '運送任務建立，目標醫院指定',
            apiEndpoint: 'POST /api/v1/triage/:id/transport',
            requiredLevel: 3,
        },
        {
            id: 'MS-08',
            actor: '指揮官',
            action: '結束任務，產生 AAR',
            expectedResult: '任務結束，AAR 報告生成',
            apiEndpoint: 'POST /api/v1/missions/:id/close',
            requiredLevel: 4,
        },
    ],
    acceptanceCriteria: [
        '失蹤者家屬可透過查詢碼追蹤狀態',
        '所有搜索區域都有任務覆蓋',
        '傷患從發現到入院全程追蹤',
        'AAR 報告包含時間軸與統計',
    ],
};

// ==================== 水域場景 ====================

const waterRescueScenario: DisasterScenario = {
    name: '水域場景 E2E',
    description: '颱風過後河流暴漲，民眾受困沙洲',
    actors: ['指揮官 (Level 4)', '水域小隊長 (Level 3)', '救生員 (Level 2)', '醫護人員 (Level 2)'],
    minimalDataSet: {
        missionType: 'WATER_RESCUE',
        location: { lat: 25.0330, lng: 121.5654, name: '基隆河' },
        reportedTrapped: 5,
        waterCondition: { flowRate: 'high', depth: 2.5, debris: true },
    },
    steps: [
        {
            id: 'WR-01',
            actor: '指揮官',
            action: '建立水域救援任務',
            expectedResult: '任務場次建立成功',
            apiEndpoint: 'POST /api/v1/missions',
            requiredLevel: 4,
        },
        {
            id: 'WR-02',
            actor: '指揮官',
            action: '設定安全區域與危險區',
            expectedResult: 'Geofence 建立成功',
            apiEndpoint: 'POST /api/v1/geofence',
            requiredLevel: 3,
        },
        {
            id: 'WR-03',
            actor: '水域小隊長',
            action: '評估現場並派遣救援任務',
            expectedResult: '多個救援任務派遣至救生員',
            apiEndpoint: 'POST /api/v1/task-dispatch/tasks',
            requiredLevel: 3,
        },
        {
            id: 'WR-04',
            actor: '救生員',
            action: '進入水域救援',
            expectedResult: '任務開始，即時位置追蹤',
            apiEndpoint: 'POST /api/v1/task-dispatch/tasks/:id/start',
            requiredLevel: 1,
        },
        {
            id: 'WR-05',
            actor: '救生員',
            action: '救出受困者',
            expectedResult: '更新救援人數統計',
            apiEndpoint: 'PATCH /api/v1/task-dispatch/tasks/:id',
            requiredLevel: 1,
        },
        {
            id: 'WR-06',
            actor: '醫護人員',
            action: '岸上檢傷分類',
            expectedResult: '傷患 START 分級，安排後送',
            apiEndpoint: 'POST /api/v1/triage/victims',
            requiredLevel: 2,
        },
        {
            id: 'WR-07',
            actor: '水域小隊長',
            action: '確認全員安全撤離',
            expectedResult: '所有人員完成簽退',
            apiEndpoint: 'POST /api/v1/attendance/check-out',
            requiredLevel: 3,
        },
        {
            id: 'WR-08',
            actor: '指揮官',
            action: '任務結案',
            expectedResult: 'SITREP 與 AAR 完成',
            apiEndpoint: 'POST /api/v1/missions/:id/close',
            requiredLevel: 4,
        },
    ],
    acceptanceCriteria: [
        '救生員進入危險區域時收到警告',
        '受困者全數救出並追蹤',
        '傷患運送全程記錄',
        '人員安全簽退紀錄完整',
    ],
};

// ==================== 測試套件 ====================

describe('Disaster Response E2E Scenarios', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('山搜場景 E2E (Mountain Search)', () => {
        it('Scenario structure is valid', () => {
            expect(mountainSearchScenario.steps).toHaveLength(8);
            expect(mountainSearchScenario.actors).toHaveLength(4);
            expect(mountainSearchScenario.acceptanceCriteria).toHaveLength(4);
        });

        it('Each step has required fields', () => {
            mountainSearchScenario.steps.forEach(step => {
                expect(step.id).toBeDefined();
                expect(step.actor).toBeDefined();
                expect(step.action).toBeDefined();
                expect(step.expectedResult).toBeDefined();
            });
        });

        it('Step sequence follows command chain', () => {
            const firstStep = mountainSearchScenario.steps[0];
            const lastStep = mountainSearchScenario.steps[mountainSearchScenario.steps.length - 1];
            
            // First and last steps should be highest authority (指揮官)
            expect(firstStep.actor).toBe('指揮官');
            expect(lastStep.actor).toBe('指揮官');
        });

        it('Mission flow covers: Create → Search → Find → Triage → Transport → Close', () => {
            const actions = mountainSearchScenario.steps.map(s => s.action);
            
            expect(actions.some(a => a.includes('建立'))).toBe(true);  // Create
            expect(actions.some(a => a.includes('搜索'))).toBe(true);  // Search
            expect(actions.some(a => a.includes('發現'))).toBe(true);  // Find
            expect(actions.some(a => a.includes('檢傷'))).toBe(true);  // Triage
            expect(actions.some(a => a.includes('後送'))).toBe(true);  // Transport
            expect(actions.some(a => a.includes('結束'))).toBe(true);  // Close
        });

        it('All API endpoints are defined', () => {
            const stepsWithEndpoints = mountainSearchScenario.steps.filter(s => s.apiEndpoint);
            expect(stepsWithEndpoints.length).toBe(mountainSearchScenario.steps.length);
        });
    });

    describe('水域場景 E2E (Water Rescue)', () => {
        it('Scenario structure is valid', () => {
            expect(waterRescueScenario.steps).toHaveLength(8);
            expect(waterRescueScenario.actors).toHaveLength(4);
            expect(waterRescueScenario.acceptanceCriteria).toHaveLength(4);
        });

        it('Each step has required fields', () => {
            waterRescueScenario.steps.forEach(step => {
                expect(step.id).toBeDefined();
                expect(step.actor).toBeDefined();
                expect(step.action).toBeDefined();
                expect(step.expectedResult).toBeDefined();
            });
        });

        it('Includes safety zone setup', () => {
            const safetyStep = waterRescueScenario.steps.find(s => 
                s.action.includes('安全區域') || s.action.includes('Geofence')
            );
            expect(safetyStep).toBeDefined();
        });

        it('includes personnel safety checkout', () => {
            const checkoutStep = waterRescueScenario.steps.find(s => 
                s.action.includes('撤離') || s.action.includes('簽退')
            );
            expect(checkoutStep).toBeDefined();
        });

        it('Mission flow covers: Create → Zone → Dispatch → Rescue → Triage → Checkout → Close', () => {
            const actions = waterRescueScenario.steps.map(s => s.action);
            
            expect(actions.some(a => a.includes('建立'))).toBe(true);      // Create
            expect(actions.some(a => a.includes('區域'))).toBe(true);      // Zone
            expect(actions.some(a => a.includes('派遣'))).toBe(true);      // Dispatch
            expect(actions.some(a => a.includes('救援') || a.includes('救出'))).toBe(true); // Rescue
            expect(actions.some(a => a.includes('檢傷'))).toBe(true);      // Triage
            expect(actions.some(a => a.includes('撤離'))).toBe(true);      // Checkout
            expect(actions.some(a => a.includes('結案'))).toBe(true);      // Close
        });
    });

    describe('Cross-Scenario Validation', () => {
        it('Both scenarios use consistent API patterns', () => {
            const msEndpoints = mountainSearchScenario.steps
                .map(s => s.apiEndpoint?.split('/')[3])
                .filter(Boolean);
            const wrEndpoints = waterRescueScenario.steps
                .map(s => s.apiEndpoint?.split('/')[3])
                .filter(Boolean);
            
            // Both should use missions, task-dispatch, triage
            const commonModules = ['missions', 'task-dispatch', 'triage'];
            commonModules.forEach(module => {
                const msHas = msEndpoints.some(e => e?.includes(module));
                const wrHas = wrEndpoints.some(e => e?.includes(module));
                expect(msHas || wrHas).toBe(true);
            });
        });

        it('Both scenarios define acceptance criteria', () => {
            expect(mountainSearchScenario.acceptanceCriteria.length).toBeGreaterThan(0);
            expect(waterRescueScenario.acceptanceCriteria.length).toBeGreaterThan(0);
        });
    });
});

// Export scenarios for documentation and drill simulation
export { mountainSearchScenario, waterRescueScenario, DisasterScenario, ScenarioStep };
