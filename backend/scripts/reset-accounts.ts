/**
 * Account Reset Script (Simplified)
 * Deletes all accounts - new owner will be created via Firebase Auth
 * 
 * Usage: npx ts-node scripts/reset-accounts.ts
 */

import { DataSource } from 'typeorm';

// Database configuration
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
            // 1. Check current accounts
            const currentCount = await queryRunner.query('SELECT COUNT(*) as count FROM account');
            console.log(`📊 Current accounts: ${currentCount[0].count}`);

            // 2. Delete all account-role relationships
            console.log('🗑️ Deleting account-role relationships...');
            const deletedRoles = await queryRunner.query('DELETE FROM account_roles_role');
            console.log(`   Deleted ${deletedRoles?.rowCount || 'all'} role assignments`);
            
            // 3. Delete all accounts
            console.log('🗑️ Deleting all accounts...');
            const deletedAccounts = await queryRunner.query('DELETE FROM account');
            console.log(`   Deleted ${deletedAccounts?.rowCount || 'all'} accounts`);

            await queryRunner.commitTransaction();
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('✅ Account reset complete!');
            console.log('');
            console.log('📝 Next steps:');
            console.log('   1. Go to Firebase Console > Authentication');
            console.log('   2. Delete all users (or keep existing)');
            console.log('   3. Create new owner user (email/password 由操作者自行決定，勿寫入原始碼)');
            console.log('   4. Login via web app - account will be auto-created with owner role');
            console.log('═══════════════════════════════════════════════════════');
            
        } catch (error) {
            console.error('❌ Transaction error, rolling back...');
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
