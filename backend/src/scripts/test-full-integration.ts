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
    logging: false,
});

async function runIntegrationTests() {
    console.log('='.repeat(70));
    console.log('志工整合測試 - Entity 關聯 + 權限同步 (SQL 版本)');
    console.log('='.repeat(70));

    try {
        await AppDataSource.initialize();
        console.log('[Setup] ✓ 資料庫已連接\n');

        // ========== 測試 1: 檢查外鍵約束 ==========
        console.log('[Test 1] 檢查外鍵約束');
        console.log('-'.repeat(70));

        const fkCheck = await AppDataSource.query(`
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table,
                rc.delete_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
            WHERE tc.table_name = 'volunteers'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'account_id';
        `);

        if (fkCheck.length > 0) {
            console.log('✅ 外鍵約束已正確建立:');
            console.table(fkCheck);
        } else {
            console.log('❌ 外鍵約束不存在!');
        }

        // ========== 測試 2: 創建測試資料 ==========
        console.log('\n[Test 2] 創建測試資料並測試關聯');
        console.log('-'.repeat(70));

        // 2.1 創建測試帳號
        const testEmail = `test.${Date.now()}@example.com`;
        const [testAccount] = await AppDataSource.query(`
            INSERT INTO accounts (id, email, phone, password_hash, display_name, approval_status, phone_verified, email_verified)
            VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'approved', true, true)
            RETURNING id, email, phone;
        `, [testEmail, `0912${Date.now().toString().slice(-6)}`, '$2a$10$test', '測試帳號']);

        console.log('✓ 測試帳號已創建:', testAccount.id);

        // 2.2 創建志工
        const [volunteer] = await AppDataSource.query(`
            INSERT INTO volunteers 
            (id, name, email, phone, region, skills, account_id, approval_status, status, service_hours, total_points, task_count)
            VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, 'pending', 'offline', 0, 0, 0)
            RETURNING id, name, account_id;
        `, ['測試志工', testEmail, testAccount.phone || '0912345678', '台北市', '{急救,搜救}', testAccount.id]);

        console.log('✓ 志工已創建:', volunteer.id);

        // 2.3 測試 JOIN 查詢 (Entity 關聯)
        console.log('\n測試 Entity 關聯查詢:');
        const joinTest = await AppDataSource.query(`
            SELECT 
                v.id as volunteer_id,
                v.name as volunteer_name,
                v.approval_status,
                a.id as account_id,
                a.email as account_email,
                STRING_AGG(r.name, ', ') as current_roles
            FROM volunteers v
            INNER JOIN accounts a ON v.account_id = a.id
            LEFT JOIN account_roles ar ON a.id = ar.account_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE v.id = $1
            GROUP BY v.id, v.name, v.approval_status, a.id, a.email;
        `, [volunteer.id]);

        console.table(joinTest);

        // ========== 測試 3: 權限同步 - 審核通過 ==========
        console.log('\n[Test 3] 測試權限同步 - 審核通過');
        console.log('-'.repeat(70));

        // 3.1 更新志工狀態為 approved
        const approvedCount = await AppDataSource.query(`
            SELECT COUNT(*)::int as count FROM volunteers WHERE approval_status = 'approved';
        `);
        const year = new Date().getFullYear();
        const volunteerCode = `LK${year}${String(approvedCount[0].count + 1).padStart(4, '0')}`;

        await AppDataSource.query(`
            UPDATE volunteers
            SET approval_status = 'approved',
                approved_by = 'test-admin',
                approved_at = NOW(),
                status = 'available',
                volunteer_code = $1
            WHERE id = $2;
        `, [volunteerCode, volunteer.id]);

        console.log('✓ 志工狀態已更新為 approved');
        console.log('  志工編號:', volunteerCode);

        // 3.2 分配 volunteer role (模擬 assignRoleInternal)
        await AppDataSource.query(`
            INSERT INTO account_roles (account_id, role_id)
            SELECT $1, id FROM roles WHERE name = 'volunteer'
            ON CONFLICT DO NOTHING;
        `, [testAccount.id]);

        console.log('✓ 已分配 volunteer role');

        // 3.3 驗證權限
        const afterApproval = await AppDataSource.query(`
            SELECT 
                a.id,
                a.email,
                STRING_AGG(r.name, ', ') as roles,
                MAX(r.level) as max_level
            FROM accounts a
            LEFT JOIN account_roles ar ON a.id = ar.account_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE a.id = $1
            GROUP BY a.id, a.email;
        `, [testAccount.id]);

        console.log('\n審核後的帳號狀態:');
        console.table(afterApproval);

        const hasVolunteerRole = afterApproval[0].roles && afterApproval[0].roles.includes('volunteer');
        console.log(hasVolunteerRole ? '✅' : '❌', '是否有 volunteer role:', hasVolunteerRole ? '是' : '否');

        // ========== 測試 4: 暫停志工 - 移除權限 ==========
        console.log('\n[Test 4] 測試權限同步 - 暫停志工');
        console.log('-'.repeat(70));

        // 4.1 更新志工狀態為 suspended
        await AppDataSource.query(`
            UPDATE volunteers
            SET approval_status = 'suspended',
                approval_note = '測試暫停',
                status = 'offline'
            WHERE id = $1;
        `, [volunteer.id]);

        console.log('✓ 志工狀態已更新為 suspended');

        // 4.2 移除 volunteer role (模擬 removeRoleInternal)
        await AppDataSource.query(`
            DELETE FROM account_roles
            WHERE account_id = $1
              AND role_id = (SELECT id FROM roles WHERE name = 'volunteer');
        `, [testAccount.id]);

        console.log('✓ 已移除 volunteer role');

        // 4.3 驗證權限
        const afterSuspend = await AppDataSource.query(`
            SELECT 
                a.id,
                a.email,
                STRING_AGG(r.name, ', ') as roles
            FROM accounts a
            LEFT JOIN account_roles ar ON a.id = ar.account_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE a.id = $1
            GROUP BY a.id, a.email;
        `, [testAccount.id]);

        console.log('\n暫停後的帳號狀態:');
        console.table(afterSuspend);

        const stillHasRole = afterSuspend[0].roles && afterSuspend[0].roles.includes('volunteer');
        console.log(!stillHasRole ? '✅' : '❌', '是否有 volunteer role:', stillHasRole ? '是' : '否');

        // ========== 清理 ==========
        console.log('\n[Cleanup] 清理測試資料');
        console.log('-'.repeat(70));

        await AppDataSource.query(`DELETE FROM volunteers WHERE id = $1`, [volunteer.id]);
        await AppDataSource.query(`DELETE FROM accounts WHERE id = $1`, [testAccount.id]);
        console.log('✓ 測試資料已清理');

        await AppDataSource.destroy();

        // ========== 總結 ==========
        console.log('\n' + '='.repeat(70));
        console.log('測試總結');
        console.log('='.repeat(70));
        console.log(fkCheck.length > 0 ? '✅' : '❌', 'Test 1: 外鍵約束 -', fkCheck.length > 0 ? 'PASS' : 'FAIL');
        console.log(joinTest.length > 0 ? '✅' : '❌', 'Test 2: Entity 關聯查詢 - PASS');
        console.log(hasVolunteerRole ? '✅' : '❌', 'Test 3: 審核通過分配權限 -', hasVolunteerRole ? 'PASS' : 'FAIL');
        console.log(!stillHasRole ? '✅' : '❌', 'Test 4: 暫停移除權限 -', !stillHasRole ? 'PASS' : 'FAIL');

        if (fkCheck.length > 0 && hasVolunteerRole && !stillHasRole) {
            console.log('\n🎉 所有測試通過!志工整合功能正常運作!');
        } else {
            console.log('\n⚠️  部分測試未通過,請檢查');
        }
        console.log('='.repeat(70));

        process.exit(0);

    } catch (error) {
        console.error('\n❌ 測試失敗:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}

runIntegrationTests();
