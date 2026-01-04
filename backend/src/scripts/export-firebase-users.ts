/**
 * Firebase 使用者匯出腳本
 * 用於將舊專案的使用者資料匯出並匯入至新專案
 * 
 * 執行方式：
 * npx ts-node scripts/export-firebase-users.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// 舊專案 Service Account（請替換為實際路徑）
const OLD_SERVICE_ACCOUNT = process.env.OLD_FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.OLD_FIREBASE_SERVICE_ACCOUNT)
  : require('./old-project-service-account.json');

// 初始化 Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(OLD_SERVICE_ACCOUNT),
});

interface ExportedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  disabled: boolean;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  customClaims?: Record<string, any>;
  providerData: Array<{
    providerId: string;
    uid: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
  }>;
}

async function exportUsers(): Promise<void> {
  console.log('Starting Firebase user export...');
  
  const users: ExportedUser[] = [];
  let nextPageToken: string | undefined;
  
  do {
    const listResult = await admin.auth().listUsers(1000, nextPageToken);
    
    for (const userRecord of listResult.users) {
      users.push({
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        phoneNumber: userRecord.phoneNumber,
        disabled: userRecord.disabled,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        },
        customClaims: userRecord.customClaims,
        providerData: userRecord.providerData.map(p => ({
          providerId: p.providerId,
          uid: p.uid,
          displayName: p.displayName,
          email: p.email,
          phoneNumber: p.phoneNumber,
          photoURL: p.photoURL,
        })),
      });
    }
    
    nextPageToken = listResult.pageToken;
    console.log(`Exported ${users.length} users...`);
    
  } while (nextPageToken);
  
  // 儲存為 JSON 檔案
  const outputPath = path.join(__dirname, 'exported-users.json');
  fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));
  
  console.log(`\nExport complete!`);
  console.log(`Total users: ${users.length}`);
  console.log(`Output file: ${outputPath}`);
  console.log(`\nTo import to new project:`);
  console.log(`firebase auth:import ${outputPath} --project=emergency-response-911`);
}

exportUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Export failed:', error);
    process.exit(1);
  });
