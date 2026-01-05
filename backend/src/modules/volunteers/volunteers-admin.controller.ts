import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { VolunteersService, CreateVolunteerDto } from './volunteers.service';
import { Volunteer } from './volunteers.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

const MOCK_VOLUNTEERS: CreateVolunteerDto[] = [
    {
        name: '王大明',
        email: 'wang.daming@example.com',
        phone: '0912-345-678',
        region: '台北市中正區',
        address: '台北市中正區忠孝東路一段100號',
        skills: ['急救', '搜救', '通訊'],
        emergencyContact: '王媽媽',
        emergencyPhone: '0923-456-789',
        notes: '具有 EMT-1 證照',
    },
    {
        name: '李小華',
        email: 'li.xiaohua@example.com',
        phone: '0923-456-789',
        region: '台北市大安區',
        address: '台北市大安區和平東路二段50號',
        skills: ['醫療', '護理', '心理輔導'],
        emergencyContact: '李爸爸',
        emergencyPhone: '0934-567-890',
        notes: '護理師背景',
    },
    {
        name: '張志強',
        email: 'zhang.zhiqiang@example.com',
        phone: '0934-567-890',
        region: '新北市板橋區',
        address: '新北市板橋區文化路一段200號',
        skills: ['駕駛', '物資運送', '機械維修'],
        emergencyContact: '張太太',
        emergencyPhone: '0945-678-901',
        notes: '擁有大貨車駕照',
    },
    {
        name: '陳美玲',
        email: 'chen.meiling@example.com',
        phone: '0945-678-901',
        region: '台北市信義區',
        address: '台北市信義區松仁路88號',
        skills: ['翻譯', '外語溝通', '文書處理'],
        emergencyContact: '陳先生',
        emergencyPhone: '0956-789-012',
        notes: '英日語流利',
    },
    {
        name: '林志偉',
        email: 'lin.zhiwei@example.com',
        phone: '0956-789-012',
        region: '桃園市中壢區',
        address: '桃園市中壢區中山路300號',
        skills: ['搜救', '繩索技術', '登山'],
        emergencyContact: '林媽媽',
        emergencyPhone: '0967-890-123',
        notes: '山域搜救專長',
    },
    {
        name: '黃雅琪',
        email: 'huang.yaqi@example.com',
        phone: '0967-890-123',
        region: '台中市西屯區',
        address: '台中市西屯區台灣大道四段500號',
        skills: ['社工', '心理支持', '兒童照護'],
        emergencyContact: '黃爸爸',
        emergencyPhone: '0978-901-234',
        notes: '社工師證照',
    },
    {
        name: '劉建國',
        email: 'liu.jianguo@example.com',
        phone: '0978-901-234',
        region: '高雄市前鎮區',
        address: '高雄市前鎮區中山二路100號',
        skills: ['電力維修', '水電', '發電機操作'],
        emergencyContact: '劉太太',
        emergencyPhone: '0989-012-345',
        notes: '電機技師',
    },
    {
        name: '吳淑芬',
        email: 'wu.shufen@example.com',
        phone: '0989-012-345',
        region: '台南市東區',
        address: '台南市東區中華東路一段200號',
        skills: ['烹飪', '物資管理', '倉儲'],
        emergencyContact: '吳先生',
        emergencyPhone: '0910-123-456',
        notes: '餐飲業經驗',
    },
    {
        name: '蔡明宏',
        email: 'cai.minghong@example.com',
        phone: '0910-123-456',
        region: '新竹市東區',
        address: '新竹市東區光復路二段100號',
        skills: ['資訊', '通訊設備', '網路架設'],
        emergencyContact: '蔡媽媽',
        emergencyPhone: '0921-234-567',
        notes: '資訊工程師',
    },
    {
        name: '楊雅婷',
        email: 'yang.yating@example.com',
        phone: '0921-234-567',
        region: '彰化縣彰化市',
        address: '彰化縣彰化市中山路一段50號',
        skills: ['急救', 'CPR', 'AED操作'],
        emergencyContact: '楊爸爸',
        emergencyPhone: '0932-345-678',
        notes: 'BLS 證照',
    },
    {
        name: '許志豪',
        email: 'xu.zhihao@example.com',
        phone: '0932-345-678',
        region: '嘉義市西區',
        address: '嘉義市西區中山路200號',
        skills: ['建築', '結構評估', '危樓判定'],
        emergencyContact: '許太太',
        emergencyPhone: '0943-456-789',
        notes: '建築師背景',
    },
    {
        name: '鄭淑惠',
        email: 'zheng.shuhui@example.com',
        phone: '0943-456-789',
        region: '屏東縣屏東市',
        address: '屏東縣屏東市自由路100號',
        skills: ['護理', '傷患照護', '衛生教育'],
        emergencyContact: '鄭先生',
        emergencyPhone: '0954-567-890',
        notes: '護理師',
    },
    {
        name: '謝文傑',
        email: 'xie.wenjie@example.com',
        phone: '0954-567-890',
        region: '宜蘭縣宜蘭市',
        address: '宜蘭縣宜蘭市中山路三段150號',
        skills: ['潛水', '水域搜救', '游泳'],
        emergencyContact: '謝媽媽',
        emergencyPhone: '0965-678-901',
        notes: '潛水教練證照',
    },
    {
        name: '賴美君',
        email: 'lai.meijun@example.com',
        phone: '0965-678-901',
        region: '花蓮縣花蓮市',
        address: '花蓮縣花蓮市中正路200號',
        skills: ['登山', '野外求生', '地圖判讀'],
        emergencyContact: '賴爸爸',
        emergencyPhone: '0976-789-012',
        notes: '登山嚮導',
    },
    {
        name: '邱建志',
        email: 'qiu.jianzhi@example.com',
        phone: '0976-789-012',
        region: '台東縣台東市',
        address: '台東縣台東市中華路一段100號',
        skills: ['無線電', '衛星通訊', '定位系統'],
        emergencyContact: '邱太太',
        emergencyPhone: '0987-890-123',
        notes: '業餘無線電執照',
    },
];

@Controller('volunteers/admin')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OWNER) // 僅系統擁有者可執行
export class VolunteersAdminController {
    constructor(private readonly volunteersService: VolunteersService) { }

    @Post('seed')
    @HttpCode(HttpStatus.OK)
    async seedVolunteers() {
        const createdVolunteers: Volunteer[] = [];

        try {
            for (const volunteerData of MOCK_VOLUNTEERS) {
                // 檢查是否已存在（用 email 檢查）
                // const existing = await this.volunteersService.findByEmail(volunteerData.email);
                // if (existing) continue;

                const volunteer = await this.volunteersService.create({
                    ...volunteerData,
                });

                // 直接審核通過
                const approved = await this.volunteersService.approve(
                    volunteer.id,
                    'system',
                    '系統初始化資料'
                );

                // 設定服務時數和任務數（模擬統計）
                const serviceHours = Math.floor(Math.random() * 150) + 40;
                const taskCount = Math.floor(serviceHours / 10);
                await this.volunteersService['volunteersRepository'].update(approved.id, {
                    serviceHours,
                    taskCount,
                });

                createdVolunteers.push(approved);
            }

            return {
                success: true,
                message: `成功植入 ${createdVolunteers.length} 位志工（已審核通過）`,
                data: {
                    count: createdVolunteers.length,
                    volunteers: createdVolunteers.map(v => ({
                        id: v.id,
                        name: v.name,
                        region: v.region,
                        approvalStatus: v.approvalStatus,
                    })),
                },
            };
        } catch (error) {
            return {
                success: false,
                message: `種子資料植入失敗: ${error.message}`,
                data: {
                    created: createdVolunteers.length,
                    error: error.message,
                },
            };
        }
    }
}
