/**
 * Account Reset Script
 * Deletes all accounts and creates a single owner account
 * 
 * Usage: npx ts-node scripts/reset-accounts.ts
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Database configuration (matches AppModule TypeORM config)
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'light_keepers',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    logging: true,
});

async function resetAccounts() {
    console.log('🚀 Starting account reset...');
    
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Delete all account-role relationships
            console.log('🗑️ Deleting account-role relationships...');
            await queryRunner.query('DELETE FROM account_roles_role');
            
            // 2. Delete all accounts
            console.log('🗑️ Deleting all accounts...');
            await queryRunner.query('DELETE FROM account');
            
            // 3. Create new owner account
            console.log('👤 Creating owner account...');
            const accountId = uuidv4();
            const email = 'xiangteng007@gmail.com';
            const passwordHash = await bcrypt.hash('19861007', 10);
            
            await queryRunner.query(`
                INSERT INTO account (id, email, "passwordHash", "displayName", phone, "isActive", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `, [accountId, email, passwordHash, 'System Owner', '', true]);
            
            // 4. Get owner role ID
            const ownerRole = await queryRunner.query(
                `SELECT id FROM role WHERE name = 'owner' LIMIT 1`
            );
            
            if (ownerRole && ownerRole.length > 0) {
                // 5. Assign owner role
                await queryRunner.query(`
                    INSERT INTO account_roles_role ("accountId", "roleId")
                    VALUES ($1, $2)
                `, [accountId, ownerRole[0].id]);
                console.log('✅ Owner role assigned');
            } else {
                console.log('⚠️ Owner role not found, skipping role assignment');
            }

            await queryRunner.commitTransaction();
            console.log('✅ Account reset complete!');
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Password: 19861007`);
            console.log(`🆔 Account ID: ${accountId}`);
            
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
    }
}

resetAccounts();
