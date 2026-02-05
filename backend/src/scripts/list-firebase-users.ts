import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as admin from 'firebase-admin';

/**
 * 腳本：列出 Firebase 使用者
 * 
 * 執行方式：
 * npx ts-node -r tsconfig-paths/register src/scripts/list-firebase-users.ts
 */
async function bootstrap() {
    console.log('🔍 Listing Firebase Users...\n');

    // Initialize NestJS app to trigger Firebase Admin SDK init
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        // Wait a bit for Firebase to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if Firebase is initialized
        const apps = admin.apps;
        if (!apps || apps.length === 0) {
            console.log('❌ Firebase Admin not initialized');
            await app.close();
            return;
        }

        console.log(`✅ Firebase Admin initialized (${apps.length} app(s))`);

        // List all users
        console.log('\n' + '='.repeat(70));
        console.log('Firebase 使用者清單');
        console.log('='.repeat(70));

        let totalUsers = 0;
        let pageToken: string | undefined;

        do {
            const listResult = await admin.auth().listUsers(100, pageToken);

            for (const user of listResult.users) {
                totalUsers++;
                const providers = user.providerData.map(p => p.providerId).join(', ') || 'none';
                const lastSignIn = user.metadata.lastSignInTime 
                    ? new Date(user.metadata.lastSignInTime).toLocaleString('zh-TW')
                    : 'never';

                console.log(`\n${totalUsers}. ${user.displayName || '(no name)'}`);
                console.log(`   UID:          ${user.uid}`);
                console.log(`   Email:        ${user.email || '(none)'}`);
                console.log(`   Phone:        ${user.phoneNumber || '(none)'}`);
                console.log(`   Verified:     ${user.emailVerified ? '✅' : '❌'}`);
                console.log(`   Providers:    ${providers}`);
                console.log(`   Last Sign-in: ${lastSignIn}`);
                console.log(`   Disabled:     ${user.disabled ? '⚠️ YES' : 'No'}`);
            }

            pageToken = listResult.pageToken;
        } while (pageToken);

        console.log('\n' + '='.repeat(70));
        console.log(`總計：${totalUsers} 位使用者`);
        console.log('='.repeat(70));

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }

    await app.close();
}

bootstrap();
