import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Account, Role } from '../modules/accounts/entities';
import * as bcrypt from 'bcryptjs';

/**
 * Seed 腳本：建立系統擁有者帳號
 *
 * 執行方式：
 * npx ts-node -r tsconfig-paths/register src/scripts/seed-owner.ts
 */
async function bootstrap() {
    console.log('🚀 Starting Owner Account Seed...');

    const app = await NestFactory.createApplicationContext(AppModule);

    const accountRepository: Repository<Account> = app.get(getRepositoryToken(Account));
    const roleRepository: Repository<Role> = app.get(getRepositoryToken(Role));

    // 擁有者帳號配置 - 從環境變數讀取密碼
    const ownerEmail = process.env.OWNER_EMAIL || 'xiangteng007@gmail.com';
    const ownerPassword = process.env.OWNER_PASSWORD;
    const ownerDisplayName = process.env.OWNER_DISPLAY_NAME || '系統擁有者';

    // 安全檢查：禁止使用硬編碼密碼
    if (!ownerPassword) {
        console.error('❌ OWNER_PASSWORD environment variable is required.');
        console.error('   Usage: OWNER_PASSWORD=YourSecurePassword npx ts-node src/scripts/seed-owner.ts');
        await app.close();
        process.exit(1);
    }

    try {
        // 檢查是否已存在
        const existing = await accountRepository.findOne({
            where: { email: ownerEmail },
            relations: ['roles'],
        });

        if (existing) {
            console.log('⚠️  Owner account already exists:', ownerEmail);
            console.log('   Roles:', existing.roles?.map(r => r.displayName).join(', ') || 'None');

            // 確保擁有 owner 角色
            const ownerRole = await roleRepository.findOne({ where: { name: 'owner' } });
            if (ownerRole && !existing.roles?.some(r => r.name === 'owner')) {
                existing.roles = [...(existing.roles || []), ownerRole];
                await accountRepository.save(existing);
                console.log('✅ Added owner role to existing account');
            }
        } else {
            // 創建新帳號
            const ownerRole = await roleRepository.findOne({ where: { name: 'owner' } });

            if (!ownerRole) {
                console.error('❌ Owner role not found. Please run the app once to seed roles.');
                await app.close();
                process.exit(1);
            }

            const passwordHash = await bcrypt.hash(ownerPassword, 10);

            const ownerAccount = accountRepository.create({
                email: ownerEmail,
                passwordHash,
                displayName: ownerDisplayName,
                isActive: true,
                phoneVerified: true,
                emailVerified: true,
                approvalStatus: 'approved',
                volunteerProfileCompleted: true,
                roles: [ownerRole],
            });

            await accountRepository.save(ownerAccount);

            console.log('✅ Owner account created successfully!');
            console.log('');
            console.log('📧 Email:    ', ownerEmail);
            console.log('🔑 Password:  [PROVIDED VIA ENV VAR - NOT LOGGED]');
            console.log('👤 Role:     ', ownerRole.displayName);
            console.log('');
            console.log('⚠️  請登入後立即修改密碼！');
            console.log('💡 如忘記密碼，請使用密碼重設功能或重新執行此腳本');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    await app.close();
    console.log('🏁 Seed completed.');
}

bootstrap();
