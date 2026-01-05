import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'lightkeepers',
    synchronize: false,
    logging: true,
});

async function syncAccountsToVolunteers() {
    console.log('='.repeat(70));
    console.log('同步帳號到志工表');
    console.log('='.repeat(70));
    console.log(`Database: ${process.env.DB_HOST || 'localhost'}/${process.env.DB_DATABASE || 'lightkeepers'}`);
    console.log('='.repeat(70));

    try {
        await AppDataSource.initialize();
        console.log('[Sync] ✓ 資料庫已連接\n');

        // Step 1: 為高權限帳號創建志工記錄
        console.log('[Step 1/3] 為 Level 1+ 帳號創建志工記錄...');

        const insertResult = await AppDataSource.query(`
            INSERT INTO volunteers (
                id,
                name,
                email,
                phone,
                region,
                skills,
                account_id,
                approval_status,
                status,
                service_hours,
                total_points,
                task_count,
                created_at,
                updated_at
            )
            SELECT 
                uuid_generate_v4(),
                COALESCE(a.display_name, split_part(a.email, '@', 1)),
                a.email,
                COALESCE(a.phone, '待填寫'),
                '待填寫',
                '{general}',
                a.id,
                'approved',
                'available',
                0,
                0,
                0,
                NOW(),
                NOW()
            FROM accounts a
            INNER JOIN account_roles ar ON a.id = ar.account_id
            INNER JOIN roles r ON ar.role_id = r.id
            WHERE r.level >= 1
              AND NOT EXISTS (
                  SELECT 1 FROM volunteers v WHERE v.account_id = a.id
              )
            GROUP BY a.id, a.display_name, a.email, a.phone
            RETURNING id, name, email;
        `);

        console.log(`✓ 創建了 ${insertResult.length} 個新志工記錄`);
        if (insertResult.length > 0) {
            console.table(insertResult);
        }

        // Step 2: 生成志工編號
        console.log('\n[Step 2/3] 生成志工編號...');

        const updateResult = await AppDataSource.query(`
            WITH numbered AS (
                SELECT 
                    id,
                    ROW_NUMBER() OVER (ORDER BY created_at) as rn,
                    (SELECT COUNT(*) FROM volunteers WHERE volunteer_code IS NOT NULL) as existing_count
                FROM volunteers 
                WHERE volunteer_code IS NULL 
                  AND approval_status = 'approved'
            )
            UPDATE volunteers
            SET volunteer_code = 'LK' || EXTRACT(YEAR FROM NOW())::text || LPAD((numbered.existing_count + numbered.rn)::text, 4, '0')
            FROM numbered
            WHERE volunteers.id = numbered.id
            RETURNING volunteers.id, volunteers.name, volunteers.volunteer_code;
        `);

        console.log(`✓ 生成了 ${updateResult.length} 個志工編號`);
        if (updateResult.length > 0) {
            console.table(updateResult);
        }

        // Step 3: 驗證結果
        console.log('\n[Step 3/3] 驗證結果...');

        const verifyResult = await AppDataSource.query(`
            SELECT 
                v.id,
                v.name,
                v.email,
                v.volunteer_code,
                v.approval_status,
                v.status,
                a.display_name as account_name,
                STRING_AGG(r.name, ', ') as roles
            FROM volunteers v
            LEFT JOIN accounts a ON v.account_id = a.id
            LEFT JOIN account_roles ar ON a.id = ar.account_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE v.approval_status = 'approved'
            GROUP BY v.id, v.name, v.email, v.volunteer_code, v.approval_status, v.status, a.display_name
            ORDER BY v.created_at DESC
            LIMIT 10;
        `);

        console.log('\n最近的已審核志工:');
        console.table(verifyResult);

        // 統計
        const stats = await AppDataSource.query(`
            SELECT 
                COUNT(*) FILTER (WHERE approval_status = 'approved') as approved,
                COUNT(*) FILTER (WHERE approval_status = 'pending') as pending,
                COUNT(*) as total
            FROM volunteers;
        `);

        console.log('\n志工統計:');
        console.table(stats);

        await AppDataSource.destroy();

        console.log('\n' + '='.repeat(70));
        console.log('✅ 同步完成!');
        console.log('='.repeat(70));

        process.exit(0);

    } catch (error) {
        console.error('\n❌ 同步失敗:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}

syncAccountsToVolunteers();
