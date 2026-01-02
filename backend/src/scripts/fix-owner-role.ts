import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Account, Role } from '../modules/accounts/entities';

/**
 * 診斷與修復腳本：修復系統擁有者角色
 *
 * 執行方式：
 * npx ts-node -r tsconfig-paths/register src/scripts/fix-owner-role.ts
 */
async function bootstrap() {
    console.log('🔍 Start diagnosing owner account...\n');

    const app = await NestFactory.createApplicationContext(AppModule);

    const accountRepository: Repository<Account> = app.get(getRepositoryToken(Account));
    const roleRepository: Repository<Role> = app.get(getRepositoryToken(Role));

    // 目標 Email
    const targetEmail = process.env.OWNER_EMAIL || 'xiangteng007@gmail.com';

    try {
        // 1. 列出所有可能的 owner 帳號
        console.log('='.repeat(60));
        console.log('1️⃣  Searching for accounts related to:', targetEmail);
        console.log('='.repeat(60));

        // 搜尋 email 或 googleEmail 匹配的帳號
        const accounts = await accountRepository.find({
            where: [
                { email: targetEmail },
                { googleEmail: targetEmail },
            ],
            relations: ['roles'],
        });

        console.log(`Found ${accounts.length} account(s):\n`);

        for (const acc of accounts) {
            console.log(`   ID:           ${acc.id}`);
            console.log(`   Email:        ${acc.email || '(none)'}`);
            console.log(`   GoogleEmail:  ${acc.googleEmail || '(none)'}`);
            console.log(`   GoogleID:     ${acc.googleId || '(none)'}`);
            console.log(`   FirebaseUID:  ${acc.firebaseUid || '(none)'}`);
            console.log(`   LineUserID:   ${acc.lineUserId || '(none)'}`);
            console.log(`   DisplayName:  ${acc.displayName}`);
            console.log(`   Roles:        ${acc.roles?.map(r => `${r.name}(L${r.level})`).join(', ') || 'NONE ❌'}`);
            console.log(`   LastLogin:    ${acc.lastLoginAt || '(never)'}`);
            console.log('---');
        }

        // 2. 取得 owner 角色
        console.log('\n' + '='.repeat(60));
        console.log('2️⃣  Looking up owner role');
        console.log('='.repeat(60));

        const ownerRole = await roleRepository.findOne({ where: { name: 'owner' } });
        if (!ownerRole) {
            console.error('❌ Owner role not found in database!');
            await app.close();
            process.exit(1);
        }

        console.log(`   Owner Role ID: ${ownerRole.id}`);
        console.log(`   Level: ${ownerRole.level}`);

        // 3. 修復 - 將 owner 角色分配給第一個匹配的帳號
        if (accounts.length > 0) {
            const targetAccount = accounts[0];
            const hasOwnerRole = targetAccount.roles?.some(r => r.name === 'owner');

            console.log('\n' + '='.repeat(60));
            console.log('3️⃣  Fixing owner role');
            console.log('='.repeat(60));

            if (hasOwnerRole) {
                console.log('✅ Account already has owner role. No fix needed.\n');
            } else {
                console.log(`⚠️  Account ${targetAccount.id} is missing owner role.`);
                console.log('   Adding owner role now...');

                targetAccount.roles = [...(targetAccount.roles || []), ownerRole];
                await accountRepository.save(targetAccount);

                console.log('✅ Owner role added successfully!\n');
            }

            // 4. 驗證修復
            console.log('='.repeat(60));
            console.log('4️⃣  Verification');
            console.log('='.repeat(60));

            const verifyAccount = await accountRepository.findOne({
                where: { id: targetAccount.id },
                relations: ['roles'],
            });

            console.log(`   Roles after fix: ${verifyAccount?.roles?.map(r => `${r.name}(L${r.level})`).join(', ') || 'NONE'}`);
            console.log(`   Max level: ${verifyAccount?.roles?.length ? Math.max(...verifyAccount.roles.map(r => r.level)) : 0}`);
        } else {
            console.log('\n⚠️  No accounts found for the target email.');
            console.log('   Please check if the user logged in with a different method (Google/LINE).');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }

    await app.close();
    console.log('\n🏁 Diagnosis completed.');
}

bootstrap();
