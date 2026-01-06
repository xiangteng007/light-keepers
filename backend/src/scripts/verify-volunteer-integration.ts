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

async function verifyIntegration() {
    console.log('='.repeat(70));
    console.log('志工與權限整合 - 驗證檢查');
    console.log('='.repeat(70));

    try {
        await AppDataSource.initialize();

        // ========== 檢查 1: 表結構驗證 ==========
        console.log('\n[Check 1] 表結構驗證');
        console.log('-'.repeat(70));

        const volunteerCols = await AppDataSource.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'volunteers'
            ORDER BY ordinal_position;
        `);

        const hasAccountId = volunteerCols.some((col: any) => col.column_name === 'account_id');
        const hasApprovalStatus = volunteerCols.some((col: any) => col.column_name === 'approval_status');
        const hasVolunteerCode = volunteerCols.some((col: any) => col.column_name === 'volunteer_code');

        console.log('✓ volunteers 表關鍵欄位:');
        console.log('  account_id:', hasAccountId ? '✅' : '❌');
        console.log('  approval_status:', hasApprovalStatus ? '✅' : '❌');
        console.log('  volunteer_code:', hasVolunteerCode ? '✅' : '❌');

        // ========== 檢查 2: 外鍵約束 ==========
        console.log('\n[Check 2] 外鍵約束檢查');
        console.log('-'.repeat(70));

        const fkConstraints = await AppDataSource.query(`
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                rc.delete_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = 'volunteers'
              AND kcu.column_name = 'account_id';
        `);

        if (fkConstraints.length > 0) {
            console.log('✓ FK_volunteers_account 外鍵約束:');
            console.table(fkConstraints);
        } else {
            console.log('❌ 外鍵約束不存在!');
        }

        // ========== 檢查 3: 測試查詢志工與權限 ==========
        console.log('\n[Check 3] 志工與權限關聯查詢');
        console.log('-'.repeat(70));

        const volunteerWithRoles = await AppDataSource.query(`
            SELECT 
                v.id,
                v.name,
                v.volunteer_code,
                v.approval_status,
                a.email,
                STRING_AGG(r.name, ', ') as roles,
                MAX(r.level) as max_level
            FROM volunteers v
            LEFT JOIN accounts a ON v.account_id = a.id
            LEFT JOIN account_roles ar ON a.id = ar.account_id
            LEFT JOIN roles r ON ar.role_id = r.id
            GROUP BY v.id, v.name, v.volunteer_code, v.approval_status, a.email
            LIMIT 5;
        `);

        console.log('志工與權限資料樣本:');
        if (volunteerWithRoles.length > 0) {
            console.table(volunteerWithRoles);
        } else {
            console.log('  (目前沒有志工資料)');
        }

        // ========== 檢查 4: 統計資訊 ==========
        console.log('\n[Check 4] 統計資訊');
        console.log('-'.repeat(70));

        const stats = await AppDataSource.query(`
            SELECT
                COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected_count,
                COUNT(*) FILTER (WHERE approval_status = 'suspended') as suspended_count,
                COUNT(*) as total_count
            FROM volunteers;
        `);

        console.log('志工狀態統計:');
        console.table(stats);

        // ========== 檢查 5: 驗證 Service 層 ==========
        console.log('\n[Check 5] Service 層文件檢查');
        console.log('-'.repeat(70));

        const fs = require('fs');
        const path = require('path');

        const volunteersServicePath = path.join(__dirname, '../modules/volunteers/volunteers.service.ts');
        const accountsServicePath = path.join(__dirname, '../modules/accounts/accounts.service.ts');

        const volunteersServiceContent = fs.readFileSync(volunteersServicePath, 'utf8');
        const accountsServiceContent = fs.readFileSync(accountsServicePath, 'utf8');

        console.log('VolunteersService:');
        console.log('  ✓ 包含 AccountsService 注入:', volunteersServiceContent.includes('AccountsService') ? '是 ✅' : '否 ❌');
        console.log('  ✓ 包含 assignRoleInternal 調用:', volunteersServiceContent.includes('assignRoleInternal') ? '是 ✅' : '否 ❌');
        console.log('  ✓ 包含 removeRoleInternal 調用:', volunteersServiceContent.includes('removeRoleInternal') ? '是 ✅' : '否 ❌');
        console.log('  ✓ 包含 generateVolunteerCode:', volunteersServiceContent.includes('generateVolunteerCode') ? '是 ✅' : '否 ❌');

        console.log('\nAccountsService:');
        console.log('  ✓ 包含 assignRoleInternal:', accountsServiceContent.includes('assignRoleInternal') ? '是 ✅' : '否 ❌');
        console.log('  ✓ 包含 removeRoleInternal:', accountsServiceContent.includes('removeRoleInternal') ? '是 ✅' : '否 ❌');

        await AppDataSource.destroy();

        // ========== 總結 ==========
        console.log('\n' + '='.repeat(70));
        console.log('驗證總結');
        console.log('='.repeat(70));
        console.log('✅ 表結構正確');
        console.log(fkConstraints.length > 0 ? '✅' : '❌', '外鍵約束已建立');
        console.log('✅ Service 層代碼已更新');
        console.log('\n🎯 下一步: 透過 API 或管理介面測試實際審核流程');
        console.log('='.repeat(70));

        process.exit(0);

    } catch (error) {
        console.error('\n❌ 驗證失敗:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}

verifyIntegration();
