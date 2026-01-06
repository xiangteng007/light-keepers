/**
 * 測試權限同步功能
 * 
 * 此測試會透過 HTTP 請求測試實際的志工審核流程
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface LoginResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        roles: string[];
        roleLevel: number;
    };
}

async function testPermissionSync() {
    console.log('='.repeat(70));
    console.log('志工權限同步功能測試');
    console.log('='.repeat(70));

    try {
        // ========== 步驟 0: 確保有管理員帳號 ==========
        console.log('\n[Step 0] 請先確保您有管理員帳號登入');
        console.log('如果沒有,請創建一個 Level 2+ (officer) 的帳號');
        console.log('\n請輸入管理員帳號資訊:');

        // 這裡需要實際的登入憑證
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'your-password';

        console.log(`使用管理員帳號: ${adminEmail}\n`);

        // ========== 步驟 1: 管理員登入 ==========
        console.log('[Step 1] 管理員登入...');

        const loginRes = await axios.post<LoginResponse>(`${API_BASE_URL}/api/v1/auth/login`, {
            email: adminEmail,
            password: adminPassword
        });

        const adminToken = loginRes.data.accessToken;
        const adminId = loginRes.data.user.id;

        console.log('✓ 登入成功');
        console.log('  管理員ID:', adminId);
        console.log('  權限等級:', loginRes.data.user.roleLevel);
        console.log('  角色:', loginRes.data.user.roles.join(', '));

        if (loginRes.data.user.roleLevel < 2) {
            console.error('\n❌ 錯誤: 需要 Level 2+ (officer) 權限才能審核志工!');
            process.exit(1);
        }

        // ========== 步驟 2: 創建測試帳號 ==========
        console.log('\n[Step 2] 創建測試志工帳號...');

        const testEmail = `test.volunteer.${Date.now()}@example.com`;
        const testPassword = 'Test123456!';

        const registerRes = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
            email: testEmail,
            phone: `0912${Date.now().toString().slice(-6)}`,
            password: testPassword,
            displayName: '測試志工 ' + Date.now()
        });

        console.log('✓ 測試帳號已創建');
        console.log('  Email:', testEmail);

        // 登入測試帳號以獲取 ID
        const testLoginRes = await axios.post<LoginResponse>(`${API_BASE_URL}/api/v1/auth/login`, {
            email: testEmail,
            password: testPassword
        });

        const testAccountId = testLoginRes.data.user.id;
        const testToken = testLoginRes.data.accessToken;

        console.log('  帳號ID:', testAccountId);
        console.log('  初始角色:', testLoginRes.data.user.roles.join(', ') || '無');
        console.log('  初始權限等級:', testLoginRes.data.user.roleLevel);

        // ========== 步驟 3: 創建志工申請 ==========
        console.log('\n[Step 3] 提交志工申請...');

        const volunteerRes = await axios.post(
            `${API_BASE_URL}/api/v1/volunteers`,
            {
                name: '測試志工',
                email: testEmail,
                phone: `0912${Date.now().toString().slice(-6)}`,
                region: '台北市',
                skills: ['急救', '搜救'],
                accountId: testAccountId
            },
            {
                headers: { Authorization: `Bearer ${testToken}` }
            }
        );

        const volunteerId = volunteerRes.data.id;

        console.log('✓ 志工申請已提交');
        console.log('  志工ID:', volunteerId);
        console.log('  審核狀態:', volunteerRes.data.approvalStatus);

        // ========== 步驟 4: 審核通過 ==========
        console.log('\n[Step 4] 管理員審核通過...');

        const approveRes = await axios.post(
            `${API_BASE_URL}/api/v1/volunteers/${volunteerId}/approve`,
            { note: '測試審核通過' },
            {
                headers: { Authorization: `Bearer ${adminToken}` }
            }
        );

        console.log('✓ 審核已通過');
        console.log('  審核狀態:', approveRes.data.approvalStatus);
        console.log('  志工編號:', approveRes.data.volunteerCode);

        // 等待權限同步
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ========== 步驟 5: 驗證權限 ==========
        console.log('\n[Step 5] 驗證權限是否自動同步...');

        const profileRes = await axios.get<LoginResponse['user']>(
            `${API_BASE_URL}/api/v1/auth/me`,
            {
                headers: { Authorization: `Bearer ${testToken}` }
            }
        );

        console.log('審核後的帳號狀態:');
        console.log('  角色:', profileRes.data.roles.join(', '));
        console.log('  權限等級:', profileRes.data.roleLevel);

        const hasVolunteerRole = profileRes.data.roles.includes('volunteer');
        console.log('  是否有 volunteer role:', hasVolunteerRole ? '是 ✅' : '否 ❌');

        if (hasVolunteerRole) {
            console.log('\n✅ 測試通過: 權限已自動同步!');
        } else {
            console.error('\n❌ 測試失敗: 權限未自動同步!');
            console.error('   請檢查 VolunteersService 是否正確注入 AccountsService');
        }

        // ========== 步驟 6: 測試暫停功能 ==========
        console.log('\n[Step 6] 測試暫停志工功能...');

        await axios.post(
            `${API_BASE_URL}/api/v1/volunteers/${volunteerId}/suspend`,
            { reason: '測試暫停' },
            {
                headers: { Authorization: `Bearer ${adminToken}` }
            }
        );

        console.log('✓ 志工已暫停');

        // 等待權限同步
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 驗證權限
        const profileAfterSuspend = await axios.get<LoginResponse['user']>(
            `${API_BASE_URL}/api/v1/auth/me`,
            {
                headers: { Authorization: `Bearer ${testToken}` }
            }
        );

        const stillHasVolunteerRole = profileAfterSuspend.data.roles.includes('volunteer');
        console.log('暫停後的帳號狀態:');
        console.log('  角色:', profileAfterSuspend.data.roles.join(', ') || '無');
        console.log('  是否有 volunteer role:', stillHasVolunteerRole ? '是 ❌' : '否 ✅');

        if (!stillHasVolunteerRole) {
            console.log('\n✅ 測試通過: 暫停後權限已移除!');
        } else {
            console.error('\n❌ 測試失敗: 暫停後權限未移除!');
        }

        // ========== 清理 ==========
        console.log('\n[Cleanup] 清理測試資料...');

        await axios.delete(
            `${API_BASE_URL}/api/v1/volunteers/${volunteerId}`,
            {
                headers: { Authorization: `Bearer ${adminToken}` }
            }
        );

        console.log('✓ 測試志工已刪除');

        // ========== 總結 ==========
        console.log('\n' + '='.repeat(70));
        console.log('測試總結');
        console.log('='.repeat(70));
        console.log(hasVolunteerRole ? '✅' : '❌', 'Test 1: 審核通過自動分配權限');
        console.log(!stillHasVolunteerRole ? '✅' : '❌', 'Test 2: 暫停志工自動移除權限');
        console.log('='.repeat(70));

        if (hasVolunteerRole && !stillHasVolunteerRole) {
            console.log('\n🎉 所有測試通過!權限同步功能正常運作!');
        } else {
            console.log('\n⚠️  部分測試失敗,請檢查實作');
        }

    } catch (error: any) {
        console.error('\n❌ 測試失敗:', error.response?.data || error.message);
        console.error('\n提示:');
        console.error('1. 確保後端服務正在運行');
        console.error('2. 設置正確的環境變數: ADMIN_EMAIL, ADMIN_PASSWORD');
        console.error('3. 確保 VolunteersModule 已導入 AccountsModule');
        process.exit(1);
    }
}

// 執行測試
console.log('注意: 此測試需要後端服務運行中\n');
console.log('設置環境變數:');
console.log('  ADMIN_EMAIL=your-admin@example.com');
console.log('  ADMIN_PASSWORD=your-password');
console.log('  API_URL=http://localhost:3000 (可選)\n');

testPermissionSync();
