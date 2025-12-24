import { DataSource } from 'typeorm';
import { Resource } from '../modules/resources/resources.entity';
import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * 物資資料庫種子資料
 * 植入 20 項假物資資料供測試使用
 */

const MOCK_RESOURCES = [
    // 食品類
    {
        name: '礦泉水',
        category: 'water' as const,
        quantity: 500,
        unit: '瓶',
        minQuantity: 100,
        location: '倉庫A-1',
        status: 'available' as const,
        description: '600ml 瓶裝礦泉水',
    },
    {
        name: '泡麵',
        category: 'food' as const,
        quantity: 300,
        unit: '包',
        minQuantity: 50,
        location: '倉庫A-2',
        status: 'available' as const,
        description: '即食麵食',
    },
    {
        name: '罐頭食品',
        category: 'food' as const,
        quantity: 200,
        unit: '罐',
        minQuantity: 30,
        location: '倉庫A-2',
        status: 'available' as const,
        description: '鮪魚、玉米等罐頭',
    },
    {
        name: '餅乾',
        category: 'food' as const,
        quantity: 150,
        unit: '盒',
        minQuantity: 25,
        location: '倉庫A-3',
        status: 'available' as const,
        description: '蘇打餅乾',
    },
    {
        name: '運動飲料',
        category: 'water' as const,
        quantity: 45,
        unit: '瓶',
        minQuantity: 50,
        location: '倉庫A-1',
        status: 'low' as const,
        description: '電解質補充飲料',
    },
    // 醫療類
    {
        name: '急救包',
        category: 'medical' as const,
        quantity: 50,
        unit: '個',
        minQuantity: 10,
        location: '倉庫B-1',
        status: 'available' as const,
        description: '基本急救用品',
    },
    {
        name: '繃帶',
        category: 'medical' as const,
        quantity: 200,
        unit: '捲',
        minQuantity: 50,
        location: '倉庫B-1',
        status: 'available' as const,
        description: '彈性繃帶',
    },
    {
        name: '消毒酒精',
        category: 'medical' as const,
        quantity: 30,
        unit: '瓶',
        minQuantity: 20,
        location: '倉庫B-1',
        status: 'available' as const,
        description: '75%酒精',
    },
    {
        name: '口罩',
        category: 'medical' as const,
        quantity: 15,
        unit: '盒',
        minQuantity: 20,
        location: '倉庫B-2',
        status: 'low' as const,
        description: '醫療級口罩',
    },
    {
        name: 'AED 自動體外心臟去顫器',
        category: 'medical' as const,
        quantity: 3,
        unit: '台',
        minQuantity: 2,
        location: '醫療站',
        status: 'available' as const,
        description: '急救設備',
    },
    // 收容類
    {
        name: '睡袋',
        category: 'shelter' as const,
        quantity: 100,
        unit: '個',
        minQuantity: 30,
        location: '倉庫C-1',
        status: 'available' as const,
        description: '保暖睡袋',
    },
    {
        name: '帳篷',
        category: 'shelter' as const,
        quantity: 25,
        unit: '頂',
        minQuantity: 10,
        location: '倉庫C-1',
        status: 'available' as const,
        description: '4人帳篷',
    },
    {
        name: '毛毯',
        category: 'shelter' as const,
        quantity: 80,
        unit: '條',
        minQuantity: 20,
        location: '倉庫C-2',
        status: 'available' as const,
        description: '保暖毛毯',
    },
    // 衣物類
    {
        name: '雨衣',
        category: 'clothing' as const,
        quantity: 100,
        unit: '件',
        minQuantity: 30,
        location: '倉庫D-1',
        status: 'available' as const,
        description: '成人雨衣',
    },
    {
        name: '工作手套',
        category: 'clothing' as const,
        quantity: 5,
        unit: '雙',
        minQuantity: 50,
        location: '倉庫D-1',
        status: 'depleted' as const,
        description: '防滑工作手套',
    },
    // 設備類
    {
        name: '手電筒',
        category: 'equipment' as const,
        quantity: 60,
        unit: '支',
        minQuantity: 20,
        location: '倉庫E-1',
        status: 'available' as const,
        description: 'LED 手電筒',
    },
    {
        name: '發電機',
        category: 'equipment' as const,
        quantity: 5,
        unit: '台',
        minQuantity: 2,
        location: '設備室',
        status: 'available' as const,
        description: '3000W 發電機',
    },
    {
        name: '對講機',
        category: 'equipment' as const,
        quantity: 20,
        unit: '支',
        minQuantity: 10,
        location: '設備室',
        status: 'available' as const,
        description: 'UHF 對講機',
    },
    // 其他
    {
        name: '塑膠袋',
        category: 'other' as const,
        quantity: 500,
        unit: '個',
        minQuantity: 100,
        location: '倉庫F-1',
        status: 'available' as const,
        description: '大型塑膠袋',
    },
    {
        name: '繩索',
        category: 'other' as const,
        quantity: 10,
        unit: '捆',
        minQuantity: 5,
        location: '倉庫F-1',
        status: 'available' as const,
        description: '尼龍繩 50m',
    },
];

async function seedResources() {
    console.log('🌱 開始植入物資種子資料...');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE || 'lightkeepers',
        entities: [Resource],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('✅ 資料庫連線成功');

        const resourceRepo = dataSource.getRepository(Resource);

        // 先清空現有資料
        await resourceRepo.clear();
        console.log('🗑️ 已清空現有物資資料');

        // 植入新資料
        for (const resourceData of MOCK_RESOURCES) {
            const resource = resourceRepo.create(resourceData);
            await resourceRepo.save(resource);
            console.log(`✅ 已新增物資: ${resourceData.name}`);
        }

        console.log(`\n🎉 成功植入 ${MOCK_RESOURCES.length} 項物資資料！`);

    } catch (error) {
        console.error('❌ 種子資料植入失敗:', error);
    } finally {
        await dataSource.destroy();
    }
}

seedResources();
