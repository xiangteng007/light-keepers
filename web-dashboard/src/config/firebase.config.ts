// Firebase Configuration
// 注意：這些配置值應該從環境變數獲取
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'light-keepers-mvp.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'light-keepers-mvp',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'light-keepers-mvp.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export default firebaseConfig;
