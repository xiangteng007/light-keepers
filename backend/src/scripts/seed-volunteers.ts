import { DataSource } from 'typeorm';
import { Volunteer } from '../modules/volunteers/volunteers.entity';
import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * 志工資料庫種子資料
 * 植入 15 位假志工資料供測試使用
 */

const MOCK_VOLUNTEERS = [
    {
        name: '王大明',
        email: 'wang.daming@example.com',
        phone: '0912-345-678',
        region: '台北市中正區',
        address: '台北市中正區忠孝東路一段100號',
        skills: ['急救', '搜救', '通訊'],
        status: 'available' as const,
        emergencyContact: '王媽媽',
        emergencyPhone: '0923-456-789',
        notes: '具有 EMT-1 證照',
        serviceHours: 120,
        taskCount: 15,
    },
    {
        name: '李小華',
        email: 'li.xiaohua@example.com',
        phone: '0923-456-789',
        region: '台北市大安區',
        address: '台北市大安區和平東路二段50號',
        skills: ['醫療', '護理', '心理輔導'],
        status: 'busy' as const,
        emergencyContact: '李爸爸',
        emergencyPhone: '0934-567-890',
        notes: '護理師背景',
        serviceHours: 200,
        taskCount: 25,
    },
    {
        name: '張志強',
        email: 'zhang.zhiqiang@example.com',
        phone: '0934-567-890',
        region: '新北市板橋區',
        address: '新北市板橋區文化路一段200號',
        skills: ['駕駛', '物資運送', '機械維修'],
        status: 'available' as const,
        emergencyContact: '張太太',
        emergencyPhone: '0945-678-901',
        notes: '擁有大貨車駕照',
        serviceHours: 80,
        taskCount: 10,
    },
    {
        name: '陳美玲',
        email: 'chen.meiling@example.com',
        phone: '0945-678-901',
        region: '台北市信義區',
        address: '台北市信義區松仁路88號',
        skills: ['翻譯', '外語溝通', '文書處理'],
        status: 'available' as const,
        emergencyContact: '陳先生',
        emergencyPhone: '0956-789-012',
        notes: '英日語流利',
        serviceHours: 60,
        taskCount: 8,
    },
    {
        name: '林志偉',
        email: 'lin.zhiwei@example.com',
        phone: '0956-789-012',
        region: '桃園市中壢區',
        address: '桃園市中壢區中山路300號',
        skills: ['搜救', '繩索技術', '登山'],
        status: 'offline' as const,
        emergencyContact: '林媽媽',
        emergencyPhone: '0967-890-123',
        notes: '山域搜救專長',
        serviceHours: 150,
        taskCount: 18,
    },
    {
        name: '黃雅琪',
        email: 'huang.yaqi@example.com',
        phone: '0967-890-123',
        region: '台中市西屯區',
        address: '台中市西屯區台灣大道四段500號',
        skills: ['社工', '心理支持', '兒童照護'],
        status: 'available' as const,
        emergencyContact: '黃爸爸',
        emergencyPhone: '0978-901-234',
        notes: '社工師證照',
        serviceHours: 90,
        taskCount: 12,
    },
    {
        name: '劉建國',
        email: 'liu.jianguo@example.com',
        phone: '0978-901-234',
        region: '高雄市前鎮區',
        address: '高雄市前鎮區中山二路100號',
        skills: ['電力維修', '水電', '發電機操作'],
        status: 'busy' as const,
        emergencyContact: '劉太太',
        emergencyPhone: '0989-012-345',
        notes: '電機技師',
        serviceHours: 110,
        taskCount: 14,
    },
    {
        name: '吳淑芬',
        email: 'wu.shufen@example.com',
        phone: '0989-012-345',
        region: '台南市東區',
        address: '台南市東區中華東路一段200號',
        skills: ['烹飪', '物資管理', '倉儲'],
        status: 'available' as const,
        emergencyContact: '吳先生',
        emergencyPhone: '0910-123-456',
        notes: '餐飲業經驗',
        serviceHours: 70,
        taskCount: 9,
    },
    {
        name: '蔡明宏',
        email: 'cai.minghong@example.com',
        phone: '0910-123-456',
        region: '新竹市東區',
        address: '新竹市東區光復路二段100號',
        skills: ['資訊', '通訊設備', '網路架設'],
        status: 'available' as const,
        emergencyContact: '蔡媽媽',
        emergencyPhone: '0921-234-567',
        notes: '資訊工程師',
        serviceHours: 45,
        taskCount: 6,
    },
    {
        name: '楊雅婷',
        email: 'yang.yating@example.com',
        phone: '0921-234-567',
        region: '彰化縣彰化市',
        address: '彰化縣彰化市中山路一段50號',
        skills: ['急救', 'CPR', 'AED操作'],
        status: 'offline' as const,
        emergencyContact: '楊爸爸',
        emergencyPhone: '0932-345-678',
        notes: 'BLS 證照',
        serviceHours: 55,
        taskCount: 7,
    },
    {
        name: '許志豪',
        email: 'xu.zhihao@example.com',
        phone: '0932-345-678',
        region: '嘉義市西區',
        address: '嘉義市西區中山路200號',
        skills: ['建築', '結構評估', '危樓判定'],
        status: 'available' as const,
        emergencyContact: '許太太',
        emergencyPhone: '0943-456-789',
        notes: '建築師背景',
        serviceHours: 85,
        taskCount: 11,
    },
    {
        name: '鄭淑惠',
        email: 'zheng.shuhui@example.com',
        phone: '0943-456-789',
        region: '屏東縣屏東市',
        address: '屏東縣屏東市自由路100號',
        skills: ['護理', '傷患照護', '衛生教育'],
        status: 'busy' as const,
        emergencyContact: '鄭先生',
        emergencyPhone: '0954-567-890',
        notes: '護理師',
        serviceHours: 130,
        taskCount: 16,
    },
    {
        name: '謝文傑',
        email: 'xie.wenjie@example.com',
        phone: '0954-567-890',
        region: '宜蘭縣宜蘭市',
        address: '宜蘭縣宜蘭市中山路三段150號',
        skills: ['潛水', '水域搜救', '游泳'],
        status: 'available' as const,
        emergencyContact: '謝媽媽',
        emergencyPhone: '0965-678-901',
        notes: '潛水教練證照',
        serviceHours: 95,
        taskCount: 13,
    },
    {
        name: '賴美君',
        email: 'lai.meijun@example.com',
        phone: '0965-678-901',
        region: '花蓮縣花蓮市',
        address: '花蓮縣花蓮市中正路200號',
        skills: ['登山', '野外求生', '地圖判讀'],
        status: 'available' as const,
        emergencyContact: '賴爸爸',
        emergencyPhone: '0976-789-012',
        notes: '登山嚮導',
        serviceHours: 75,
        taskCount: 10,
    },
    {
        name: '邱建志',
        email: 'qiu.jianzhi@example.com',
        phone: '0976-789-012',
        region: '台東縣台東市',
        address: '台東縣台東市中華路一段100號',
        skills: ['無線電', '衛星通訊', '定位系統'],
        status: 'offline' as const,
        emergencyContact: '邱太太',
        emergencyPhone: '0987-890-123',
        notes: '業餘無線電執照',
        serviceHours: 40,
        taskCount: 5,
    },
];

async function seedVolunteers() {
    console.log('🌱 開始植入志工種子資料...');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE || 'lightkeepers',
        entities: [Volunteer],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('✅ 資料庫連線成功');

        const volunteerRepo = dataSource.getRepository(Volunteer);

        // 先清空現有資料
        await volunteerRepo.clear();
        console.log('🗑️ 已清空現有志工資料');

        // 植入新資料（設定為已審核通過狀態）
        for (const volunteerData of MOCK_VOLUNTEERS) {
            const volunteer = volunteerRepo.create({
                ...volunteerData,
                approvalStatus: 'approved', // 設定為已審核通過
                approvedBy: 'system', // 系統自動核准
                approvedAt: new Date(),
                privacyConsent: true, // 個資同意
                privacyConsentAt: new Date(),
            });
            await volunteerRepo.save(volunteer);
            console.log(`✅ 已新增志工: ${volunteerData.name} (已審核通過)`);
        }

        console.log(`\n🎉 成功植入 ${MOCK_VOLUNTEERS.length} 位志工資料！`);

    } catch (error) {
        console.error('❌ 種子資料植入失敗:', error);
    } finally {
        await dataSource.destroy();
    }
}

seedVolunteers();
