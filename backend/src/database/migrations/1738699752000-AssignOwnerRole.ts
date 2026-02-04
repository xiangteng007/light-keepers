import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: 將 xiangteng007@gmail.com 設為系統擁有者 (Level 5)
 * 
 * 此 migration 將 owner 角色分配給指定帳號
 */
export class AssignOwnerRole1738699752000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const targetEmail = 'xiangteng007@gmail.com';
        
        // 1. 找到 owner 角色的 ID
        const ownerRoleResult = await queryRunner.query(`
            SELECT id FROM roles WHERE name = 'owner' LIMIT 1
        `);
        
        if (!ownerRoleResult || ownerRoleResult.length === 0) {
            console.log('⚠️ Owner role not found. Skipping migration.');
            return;
        }
        
        const ownerRoleId = ownerRoleResult[0].id;
        console.log(`✅ Found owner role: ${ownerRoleId}`);
        
        // 2. 找到目標帳號 (by email or googleEmail)
        const accountResult = await queryRunner.query(`
            SELECT id FROM accounts 
            WHERE email = $1 OR google_email = $1
            LIMIT 1
        `, [targetEmail]);
        
        if (!accountResult || accountResult.length === 0) {
            console.log(`⚠️ Account ${targetEmail} not found. Skipping migration.`);
            return;
        }
        
        const accountId = accountResult[0].id;
        console.log(`✅ Found account: ${accountId}`);
        
        // 3. 檢查是否已有 owner 角色
        const existingRoleResult = await queryRunner.query(`
            SELECT 1 FROM account_roles 
            WHERE account_id = $1 AND role_id = $2
            LIMIT 1
        `, [accountId, ownerRoleId]);
        
        if (existingRoleResult && existingRoleResult.length > 0) {
            console.log('✅ Account already has owner role. No action needed.');
            return;
        }
        
        // 4. 分配 owner 角色
        await queryRunner.query(`
            INSERT INTO account_roles (account_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (account_id, role_id) DO NOTHING
        `, [accountId, ownerRoleId]);
        
        console.log(`✅ Assigned owner role to ${targetEmail}`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 移除 owner 角色 (可選的回滾操作)
        const targetEmail = 'xiangteng007@gmail.com';
        
        const ownerRoleResult = await queryRunner.query(`
            SELECT id FROM roles WHERE name = 'owner' LIMIT 1
        `);
        
        if (!ownerRoleResult || ownerRoleResult.length === 0) {
            return;
        }
        
        const ownerRoleId = ownerRoleResult[0].id;
        
        const accountResult = await queryRunner.query(`
            SELECT id FROM accounts 
            WHERE email = $1 OR google_email = $1
            LIMIT 1
        `, [targetEmail]);
        
        if (!accountResult || accountResult.length === 0) {
            return;
        }
        
        const accountId = accountResult[0].id;
        
        await queryRunner.query(`
            DELETE FROM account_roles 
            WHERE account_id = $1 AND role_id = $2
        `, [accountId, ownerRoleId]);
        
        console.log(`⚠️ Removed owner role from ${targetEmail}`);
    }
}
