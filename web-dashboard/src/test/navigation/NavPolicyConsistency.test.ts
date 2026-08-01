/**
 * R1 / FE-7: 導覽 × 權限單一來源守護測試
 *
 * 保證：
 * 1. navigation.ts 每個導覽路徑都有 page-policy 條目（權限可解析，不會默默 fallback L0）
 * 2. navigation.ts 不重複、不含權限數值（結構與權限分離）
 * 3. 對帳表 §5 的 5 個權限矛盾修正後的權威值不回歸
 * 4. 災時清單（emergencyCore）與志工清單（volunteerCore）非空且包含關鍵動作
 */
import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, NAV_GROUPS } from '../../config/navigation';
import { PAGE_POLICIES, pagePolicy } from '../../config/page-policy';

describe('Navigation × Page-Policy consistency (R1)', () => {
    it('every nav item path has a page-policy entry (permission resolvable)', () => {
        const missing = NAV_ITEMS
            .filter(item => pagePolicy.getByPath(item.path) === undefined)
            .map(item => item.path);
        expect(missing).toEqual([]);
    });

    it('nav items have unique ids and unique paths', () => {
        const ids = NAV_ITEMS.map(i => i.id);
        const paths = NAV_ITEMS.map(i => i.path);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('nav item defs carry no permission values (minLevel lives only in page-policy)', () => {
        for (const item of NAV_ITEMS) {
            expect(item).not.toHaveProperty('minLevel');
            expect(item).not.toHaveProperty('requiredLevel');
        }
    });

    it('page-policy has no duplicate paths', () => {
        const paths = PAGE_POLICIES.map(p => p.path);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('every nav group referenced by an item exists', () => {
        const groupIds = new Set(NAV_GROUPS.map(g => g.id));
        for (const item of NAV_ITEMS) {
            expect(groupIds.has(item.group)).toBe(true);
        }
    });

    // 對帳表 §5：權限矛盾的修正結果（以 page-policy 為權威）不回歸
    it('resolved permission contradictions hold (ROUTE_IA_RECONCILIATION §5)', () => {
        expect(pagePolicy.getRequiredLevelByPath('/tasks')).toBe(1);
        expect(pagePolicy.getRequiredLevelByPath('/account')).toBe(0);
        expect(pagePolicy.getRequiredLevelByPath('/rescue/search-rescue')).toBe(2);
        expect(pagePolicy.getRequiredLevelByPath('/emergency/evacuation')).toBe(0);
        expect(pagePolicy.getRequiredLevelByPath('/community/mental-health')).toBe(0);
    });

    it('emergency-core list is non-empty and includes the four primary response actions', () => {
        const core = NAV_ITEMS
            .filter(i => i.emergencyCore)
            .sort((a, b) => (a.emergencyRank ?? 99) - (b.emergencyRank ?? 99));
        expect(core.length).toBeGreaterThanOrEqual(6);
        // 前四項 = 災時行動端 bottom nav（DESIGN_LANGUAGE.md §1.2）
        expect(core.slice(0, 4).map(i => i.path)).toEqual([
            '/intake',
            '/tasks',
            '/geo/map',
            '/rescue/triage',
        ]);
    });

    it('volunteer-core (L1 極簡殼) items are all accessible to L1 per policy', () => {
        const volunteer = NAV_ITEMS.filter(i => i.volunteerCore);
        expect(volunteer.length).toBeGreaterThanOrEqual(5);
        for (const item of volunteer) {
            expect(pagePolicy.getRequiredLevelByPath(item.path)).toBeLessThanOrEqual(1);
        }
    });
});
