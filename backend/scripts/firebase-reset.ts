/**
 * Firebase Account Reset Script (With SA Key)
 * Uses service account key file for Firebase Admin access
 * 
 * Usage: npx ts-node scripts/firebase-reset.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize with service account key
const serviceAccountPath = path.join(__dirname, '..', 'temp-firebase-key.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
});

async function deleteAllUsers() {
    console.log('🗑️ Deleting all Firebase Auth users...');
    
    let nextPageToken: string | undefined;
    let deletedCount = 0;
    
    do {
        const listResult = await admin.auth().listUsers(1000, nextPageToken);
        
        if (listResult.users.length > 0) {
            const uids = listResult.users.map(u => u.uid);
            await admin.auth().deleteUsers(uids);
            deletedCount += uids.length;
            console.log(`   Deleted ${uids.length} users...`);
        }
        
        nextPageToken = listResult.pageToken;
    } while (nextPageToken);
    
    console.log(`✅ Total deleted: ${deletedCount} users`);
    return deletedCount;
}

async function createOwner() {
    console.log('👤 Creating owner account...');
    
    const user = await admin.auth().createUser({
        email: 'xiangteng007@gmail.com',
        password: '19861007',
        displayName: 'System Owner',
        emailVerified: true,
    });
    
    console.log(`✅ Created owner: ${user.email} (UID: ${user.uid})`);
    return user;
}

async function main() {
    console.log('🚀 Firebase Account Reset');
    console.log('═══════════════════════════════════════════════════════');
    
    try {
        // Delete all existing users
        await deleteAllUsers();
        
        // Create new owner
        await createOwner();
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ COMPLETE!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Login at lightkeepers.ngo with:');
        console.log('      Email: xiangteng007@gmail.com');
        console.log('      Password: 19861007');
        console.log('   2. The account will be auto-created in the database');
        console.log('═══════════════════════════════════════════════════════');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

main();
