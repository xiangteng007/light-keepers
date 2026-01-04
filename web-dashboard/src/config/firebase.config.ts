// Firebase Configuration
// 注意：這些配置值應該從環境變數獲取
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBZ1f8BTHNLHf3DOMYgbkBBH4749rIpdbc',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'emergency-response-911.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'emergency-response-911',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'emergency-response-911.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '636830681432',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:636830681432:web:a5412018110d1aa627bd2d',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-NTSBN99YWR',
};

export default firebaseConfig;

