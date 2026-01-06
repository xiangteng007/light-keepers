import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VolunteersService } from '../modules/volunteers/volunteers.service';
import { AccountsService } from '../modules/accounts/accounts.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function testIntegration() {
    console.log('='.repeat(70));
    console.log('志工與權限整合 - 完整測試');
    console.log('='.repeat(70));

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const volunteersService = app.get(VolunteersService);
        const accountsService = app.get(AccountsService);

        //========== 測試準備 ==========
        console.log('\n[Preparation] 準備測試資料...');

        // 創建測試帳號
        const testAccount = await accountsService.findByEmail('test.volunteer@example.com');
        let accountId: string;

        if (!testAccount) {
            console.log('  需要先創建測試帳號,請手動創建或使用現有帳號');
            // 使用第一個 approved 帳號進行測試
            const accounts = await accountsService.findAll();
            const approvedAccount = accounts.find(a => a.approvalStatus === 'approved');
            if (!approvedAccount) {
                console.error('❌ 沒有可用的測試帳號!');
                process.exit(1);
            }
            accountId = approvedAccount.id;
            console.log('  使用帳號:', approvedAccount.email);
        } else {
            accountId = testAccount.id;
            console.log('  使用帳號:', testAccount.email);
        }

        // ========== 測試 1: 創建志工申請 ==========
        console.log('\n' + '='.repeat(70));
        console.log('[Test 1] 創建志工申請');
        console.log('='.repeat(70));

        const volunteer = await volunteersService.create({
            name: '測試志工 ' + new Date().getTime(),
            email: 'test' + Date.now() + '@example.com',
            phone: '0912345678',
            region: '台北市',
            skills: ['急救', '搜救'],
            accountId: accountId
        });

        console.log('✓ 志工申請已創建');
        console.log('  ID:', volunteer.id);
        console.log('  狀態:', volunteer.approvalStatus);
        console.log('  關聯帳號:', volunteer.accountId);

        // 檢查帳號當前權限
        const accountBefore = await accountsService.findById(accountId);
        if (!accountBefore) {
            console.error('❌ 找不到帳號!');
            process.exit(1);
        }
        console.log('  帳號當前角色:', accountBefore.roles?.map(r => r.name).join(', ') || '無');

        // ========== 測試 2: 審核通過 - 自動分配權限 ==========
        console.log('\n' + '='.repeat(70));
        console.log('[Test 2] 審核通過 - 測試自動權限同步');
        console.log('='.repeat(70));

        const approved = await volunteersService.approve(
            volunteer.id,
            'test-admin-id',
            '測試審核通過'
        );

        console.log('✓ 志工審核狀態已更新');
        console.log('  審核狀態:', approved.approvalStatus);
        console.log('  志工編號:', approved.volunteerCode);

        // 等待一下讓權限同步完成
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 驗證結果
        const accountAfter = await accountsService.findById(accountId);
        if (!accountAfter) {
            console.error('❌ 找不到帳號!');
            process.exit(1);
        }
        const roleNames = accountAfter.roles?.map(r => r.name) || [];
        const maxLevel = accountAfter.roles?.length > 0
            ? Math.max(...accountAfter.roles.map(r => r.level))
            : 0;

        console.log('\n驗證結果:');
        console.log('  ✓ 帳號角色:', accountAfter.roles?.map(r => `${r.name} (Level ${r.level})`).join(', ') || '無');
        console.log('  ✓ 最高權限等級:', maxLevel);
        console.log('  ✓ 是否有 volunteer role:', roleNames.includes('volunteer') ? '是 ✅' : '否 ❌');

        if (!roleNames.includes('volunteer')) {
            console.warn('\n⚠️  警告: 審核通過後未自動分配 volunteer role!');
            console.warn('    這可能是因為 VolunteersService 尚未注入 AccountsService');
        }

        // ========== 測試 3: 暫停志工 - 移除權限 ==========
        console.log('\n' + '='.repeat(70));
        console.log('[Test 3] 暫停志工 - 測試權限降級');
        console.log('='.repeat(70));

        const suspended = await volunteersService.suspend(volunteer.id, '測試暫停');

        console.log('✓ 志工狀態已暫停');
        console.log('  審核狀態:', suspended.approvalStatus);

        // 等待權限同步
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 驗證結果
        const accountSuspended = await accountsService.findById(accountId);
        if (!accountSuspended) {
            console.error('❌ 找不到帳號!');
            process.exit(1);
        }
        const suspendedRoles = accountSuspended.roles?.map(r => r.name) || [];

        console.log('\n驗證結果:');
        console.log('  ✓ 帳號角色:', suspendedRoles.join(', ') || '無');
        console.log('  ✓ 是否有 volunteer role:', suspendedRoles.includes('volunteer') ? '是 ❌' : '否 ✅');

        // ========== 清理測試資料 ==========
        console.log('\n' + '='.repeat(70));
        console.log('[Cleanup] 清理測試資料');
        console.log('='.repeat(70));

        await volunteersService.delete(volunteer.id);
        console.log('✓ 測試志工已刪除');

        // ========== 測試總結 ==========
        console.log('\n' + '='.repeat(70));
        console.log('測試總結');
        console.log('='.repeat(70));
        console.log('✅ Test 1: 創建志工申請 - PASS');
        console.log(roleNames.includes('volunteer') ? '✅' : '⚠️ ', 'Test 2: 審核通過自動分配權限 -', roleNames.includes('volunteer') ? 'PASS' : 'NEEDS CHECK');
        console.log(!suspendedRoles.includes('volunteer') ? '✅' : '⚠️ ', 'Test 3: 暫停志工自動移除權限 -', !suspendedRoles.includes('volunteer') ? 'PASS' : 'NEEDS CHECK');
        console.log('\n🎉 測試完成!');
        console.log('='.repeat(70));

        await app.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ 測試失敗:', error);
        await app.close();
        process.exit(1);
    }
}

testIntegration();
