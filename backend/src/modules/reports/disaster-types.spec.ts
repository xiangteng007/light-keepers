/**
 * CD-1 災型分類法 SSOT 的測試。
 *
 * 這支 spec 的主要目的是**守住向後相容硬要求**：既有 8 類的預設 severity、
 * 派遣技能與關鍵字行為不得因民防擴充而改變。設計說明見
 * docs/architecture/CIVIL_DEFENSE_TAXONOMY.md。
 */

import {
    CIVIL_DEFENSE_KEYWORDS,
    CIVIL_DEFENSE_REPORT_TYPES,
    DISASTER_TYPE_META,
    LEGACY_REPORT_TYPES,
    MASS_CASUALTY_KEYWORDS,
    REPORT_TYPE_VALUES,
    detectCivilDefenseType,
    detectMassCasualty,
    getDefaultSeverity,
    getDisasterTypeLabel,
    isReportType,
} from './disaster-types';

describe('disaster-types (CD-1)', () => {
    describe('分類法組成', () => {
        it('由既有 8 類 + 民防 4 類組成，共 12 類', () => {
            expect(LEGACY_REPORT_TYPES).toHaveLength(8);
            expect(CIVIL_DEFENSE_REPORT_TYPES).toHaveLength(4);
            expect(REPORT_TYPE_VALUES).toHaveLength(12);
        });

        it('既有 8 類的值與順序未變（擴充前的完整清單）', () => {
            expect([...LEGACY_REPORT_TYPES]).toEqual([
                'earthquake', 'flood', 'fire', 'typhoon',
                'landslide', 'traffic', 'infrastructure', 'other',
            ]);
        });

        it('每個災型都有完整中繼資料', () => {
            for (const type of REPORT_TYPE_VALUES) {
                const meta = DISASTER_TYPE_META[type];
                expect(meta.label.length).toBeGreaterThan(0);
                expect(meta.criterion.length).toBeGreaterThan(0);
                expect(Array.isArray(meta.skills)).toBe(true);
                // other 沒有應變提示以外的技能，但提示不得為空
                expect(meta.responseHints.length).toBeGreaterThan(0);
            }
        });

        it('civilDefense 旗標只標在四個民防類別上', () => {
            const flagged = REPORT_TYPE_VALUES.filter((t) => DISASTER_TYPE_META[t].civilDefense);
            expect(flagged.sort()).toEqual([...CIVIL_DEFENSE_REPORT_TYPES].sort());
        });
    });

    describe('向後相容：既有 8 類的預設 severity 全部維持 medium', () => {
        it.each(LEGACY_REPORT_TYPES)('%s 預設 medium', (type) => {
            expect(getDefaultSeverity(type)).toBe('medium');
        });

        it('未知值也回 medium（擴充前的 fallback 行為）', () => {
            expect(getDefaultSeverity(undefined)).toBe('medium');
            expect(getDefaultSeverity('not-a-type')).toBe('medium');
        });
    });

    describe('向後相容：既有 8 類的派遣技能逐字未變', () => {
        it('技能表與擴充前相同', () => {
            expect(DISASTER_TYPE_META.earthquake.skills).toEqual(['搜救', '救援']);
            expect(DISASTER_TYPE_META.flood.skills).toEqual(['水域救援', '抽水']);
            expect(DISASTER_TYPE_META.fire.skills).toEqual(['消防', '滅火']);
            expect(DISASTER_TYPE_META.typhoon.skills).toEqual(['防災', '救援']);
            expect(DISASTER_TYPE_META.landslide.skills).toEqual(['搜救', '重機械']);
            expect(DISASTER_TYPE_META.traffic.skills).toEqual(['交通管制', '救援']);
            expect(DISASTER_TYPE_META.infrastructure.skills).toEqual(['電氣', '工程']);
            expect(DISASTER_TYPE_META.other.skills).toEqual([]);
        });
    });

    describe('民防類別的預設 severity 反映其致命性', () => {
        it('空襲／恐攻／CBRN 是 critical，爆裂物是 high', () => {
            expect(getDefaultSeverity('air_raid')).toBe('critical');
            expect(getDefaultSeverity('terror_attack')).toBe('critical');
            expect(getDefaultSeverity('cbrn')).toBe('critical');
            expect(getDefaultSeverity('explosion')).toBe('high');
        });
    });

    describe('關鍵字詞彙不得與既有關鍵字衝突', () => {
        // 這是「既有關鍵字命中不變」保證的根據：兩組詞彙必須無交集
        const LEGACY_KEYWORDS = [
            '地震', '震動', '搖晃', '震災', '倒塌',
            '淹水', '積水', '水災', '溢流', '洪水',
            '火災', '起火', '火燒', '爆炸', '燃燒', '火警',
            '颱風', '強風', '風災',
            '土石流', '山崩', '坍方', '落石', '邊坡',
            '車禍', '交通事故', '撞車', '追撞', '交通', '事故',
            '電線桿', '路面', '坑洞', '建築', '損壞', '破損', '裂縫',
            '路燈', '電線', '管線',
        ];

        it('民防強訊號關鍵字與既有關鍵字沒有任何一項相同', () => {
            const civilDefenseWords = Object.values(CIVIL_DEFENSE_KEYWORDS).flat();
            const overlap = civilDefenseWords.filter((w) => LEGACY_KEYWORDS.includes(w));
            expect(overlap).toEqual([]);
        });

        it('「爆炸」刻意不在 explosion 的關鍵字裡（維持 fire 的既有命中）', () => {
            expect(CIVIL_DEFENSE_KEYWORDS.explosion).not.toContain('爆炸');
        });
    });

    describe('detectCivilDefenseType', () => {
        it.each([
            ['剛剛防空警報響了', 'air_raid'],
            ['飛彈打過來了', 'air_raid'],
            ['車站有可疑包裹沒人認領', 'explosion'],
            ['有人持刀砍人', 'terror_attack'],
            ['信裡面有不明粉末', 'cbrn'],
        ])('「%s」→ %s', (text, expected) => {
            expect(detectCivilDefenseType(text)).toBe(expected);
        });

        it('純天災描述不會誤判成民防類別', () => {
            for (const text of [
                '淹水了，水很深',
                '地震了，建築物倒塌',
                '瓦斯氣爆，隔壁整面牆炸開',
                '路口發生車禍',
                '電線桿倒塌壓到路面',
            ]) {
                expect(detectCivilDefenseType(text)).toBeNull();
            }
        });
    });

    describe('detectMassCasualty（跨災型旗標）', () => {
        it('命中大量傷患描述', () => {
            expect(detectMassCasualty('現場很多人受傷，救護車不夠')).toBe(true);
            expect(detectMassCasualty('一堆人倒在地上')).toBe(true);
        });

        it('一般通報不觸發', () => {
            expect(detectMassCasualty('淹水了，水很深')).toBe(false);
            expect(detectMassCasualty('有人受傷需要救護車')).toBe(false);
        });

        it('關鍵字表非空', () => {
            expect(MASS_CASUALTY_KEYWORDS.length).toBeGreaterThan(0);
        });
    });

    describe('型別守衛與標籤', () => {
        it('isReportType 接受 12 類、拒絕其他', () => {
            expect(isReportType('earthquake')).toBe(true);
            expect(isReportType('cbrn')).toBe(true);
            expect(isReportType('mass_casualty')).toBe(false); // 是旗標，不是災型
            expect(isReportType(undefined)).toBe(false);
        });

        it('getDisasterTypeLabel 未知值退回「其他」', () => {
            expect(getDisasterTypeLabel('air_raid')).toBe('空襲／砲擊');
            expect(getDisasterTypeLabel('nope')).toBe('其他');
        });
    });
});
