import { Skill, SkillCategory } from '../modules/volunteers/entities/skill.entity';

// 預設專長種類資料
export const DEFAULT_SKILLS: Partial<Skill>[] = [
    // 水域救援
    { code: 'WATER_RESCUE', name: '水域救援', category: 'water', sortOrder: 1 },
    { code: 'DIVING', name: '潛水', category: 'water', sortOrder: 2 },
    { code: 'BOAT_OPERATION', name: '船艇操作', category: 'water', sortOrder: 3 },
    { code: 'SWIFT_WATER', name: '激流救援', category: 'water', sortOrder: 4 },

    // 山域搜救
    { code: 'MOUNTAIN_SAR', name: '山域搜救', category: 'mountain', sortOrder: 10 },
    { code: 'ROPE_RESCUE', name: '繩索救援', category: 'mountain', sortOrder: 11 },
    { code: 'CAVE_RESCUE', name: '洞穴救援', category: 'mountain', sortOrder: 12 },
    { code: 'NAVIGATION', name: '導航定位', category: 'mountain', sortOrder: 13 },

    // 醫護
    { code: 'EMT', name: 'EMT 緊急醫療', category: 'medical', sortOrder: 20 },
    { code: 'FIRST_AID', name: '急救', category: 'medical', sortOrder: 21 },
    { code: 'CPR_AED', name: 'CPR / AED', category: 'medical', sortOrder: 22 },
    { code: 'PARAMEDIC', name: '護理人員', category: 'medical', sortOrder: 23 },

    // 機械工程
    { code: 'MECHANICAL', name: '機械操作', category: 'mechanical', sortOrder: 30 },
    { code: 'VEHICLE_REPAIR', name: '車輛維修', category: 'mechanical', sortOrder: 31 },
    { code: 'HEAVY_EQUIPMENT', name: '重型機具', category: 'mechanical', sortOrder: 32 },
    { code: 'CHAINSAW', name: '鏈鋸操作', category: 'mechanical', sortOrder: 33 },

    // 通訊
    { code: 'RADIO', name: '無線電通訊', category: 'communication', sortOrder: 40 },
    { code: 'SATELLITE_PHONE', name: '衛星電話', category: 'communication', sortOrder: 41 },
    { code: 'NETWORK', name: '網路通訊', category: 'communication', sortOrder: 42 },

    // 無人機
    { code: 'DRONE_PILOT', name: '無人機操作', category: 'drone', sortOrder: 50 },
    { code: 'DRONE_THERMAL', name: '熱成像無人機', category: 'drone', sortOrder: 51 },
    { code: 'DRONE_MAPPING', name: '無人機測繪', category: 'drone', sortOrder: 52 },

    // 其他
    { code: 'COOKING', name: '烹飪/供餐', category: 'other', sortOrder: 60 },
    { code: 'LOGISTICS', name: '後勤支援', category: 'other', sortOrder: 61 },
    { code: 'TRANSLATION', name: '翻譯', category: 'other', sortOrder: 62 },
    { code: 'COUNSELING', name: '心理諮商', category: 'other', sortOrder: 63 },
];

export async function seedSkills(skillRepository: any) {
    for (const skillData of DEFAULT_SKILLS) {
        const existing = await skillRepository.findOne({ where: { code: skillData.code } });
        if (!existing) {
            const skill = skillRepository.create({
                ...skillData,
                isActive: true,
            });
            await skillRepository.save(skill);
            console.log(`Created skill: ${skillData.name}`);
        }
    }
    console.log('Skills seeding completed');
}
