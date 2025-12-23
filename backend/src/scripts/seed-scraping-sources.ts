import { DataSource } from 'typeorm';
import { ScrapingSource } from '../modules/training/scraping-source.entity';
import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * 課程爬蟲來源種子資料
 * 植入使用者指定的 4 個目標網站
 */

const INITIAL_SOURCES = [
    {
        name: '天使之翼協會',
        url: 'https://angel-wings.tw/001_course/',
        description: '天使之翼協會課程資訊，包含各類志工培訓課程',
        selectors: {
            courseList: 'table tr, .course-item',
            courseTitle: 'td:first-child a, .course-title',
            courseDate: 'td:nth-child(2), .course-date',
        },
        cronSchedule: '0 6 * * *', // 每天早上 6 點
    },
    {
        name: '中華搜救總隊',
        url: 'https://www.sfast.org/product.php?lang=tw&tb=2',
        description: '中華搜救總隊專業搜救課程',
        selectors: {
            courseList: '.product-item, table tr',
            courseTitle: '.product-name, a',
            courseDate: '.product-date, td:nth-child(2)',
        },
        cronSchedule: '0 6 * * *',
    },
    {
        name: '王英基金會',
        url: 'https://www.wangyingfoundation.org/course.htm',
        description: '王英基金會防災教育課程',
        selectors: {
            courseList: 'table tr, .course-row',
            courseTitle: 'td:first-child a, .course-name',
            courseDate: 'td:nth-child(2), .date',
        },
        cronSchedule: '0 6 * * *',
    },
    {
        name: '緊急醫療救護學會',
        url: 'https://www.emt.org.tw/temtaf/LeCourseBrf',
        description: 'EMT 緊急醫療救護技術員訓練課程',
        selectors: {
            courseList: 'table tbody tr',
            courseTitle: 'td:first-child',
            courseDate: 'td:nth-child(2)',
            courseLocation: 'td:nth-child(3)',
        },
        cronSchedule: '0 6 * * *',
    },
];

async function seedScrapingSources() {
    console.log('🕷️ 開始植入爬蟲來源...');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE || 'lightkeepers',
        entities: [ScrapingSource],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('✅ 資料庫連線成功');

        const sourceRepo = dataSource.getRepository(ScrapingSource);

        for (const sourceData of INITIAL_SOURCES) {
            // 檢查是否已存在
            const existing = await sourceRepo.findOne({ where: { url: sourceData.url } });
            if (existing) {
                console.log(`⏭️  已存在: ${sourceData.name}`);
                continue;
            }

            const source = sourceRepo.create(sourceData);
            await sourceRepo.save(source);
            console.log(`✅ 已新增: ${sourceData.name}`);
        }

        console.log(`\n🎉 爬蟲來源植入完成！`);

    } catch (error) {
        console.error('❌ 種子資料植入失敗:', error);
    } finally {
        await dataSource.destroy();
    }
}

seedScrapingSources();
