import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    type User,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    linkWithCredential,
    EmailAuthProvider,
} from 'firebase/auth';
import firebaseConfig from '../config/firebase.config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 設置語言為繁體中文
auth.languageCode = 'zh-TW';

// Google Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account',
});

/**
 * Firebase 認證服務
 */
export const firebaseAuthService = {
    /**
     * 取得當前登入的使用者
     */
    getCurrentUser: (): User | null => {
        return auth.currentUser;
    },

    /**
     * 監聽認證狀態變化
     */
    onAuthStateChange: (callback: (user: User | null) => void) => {
        return onAuthStateChanged(auth, callback);
    },

    /**
     * 使用 Email/Password 註冊
     * 注意：不再自動發送驗證信，由用戶點擊「發送」按鈕發送 OTP
     */
    registerWithEmail: async (email: string, password: string, _displayName?: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // 不再自動發送驗證信，改用 6 位數 OTP 驗證碼流程
            // 用戶需要點擊「發送」按鈕來發送驗證碼

            return {
                success: true,
                user: userCredential.user,
                message: `註冊成功！請點擊「發送」按鈕取得驗證碼`
            };
        } catch (error: any) {
            let message = '註冊失敗';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    message = '此 Email 已被註冊';
                    break;
                case 'auth/invalid-email':
                    message = 'Email 格式不正確';
                    break;
                case 'auth/weak-password':
                    message = '密碼強度不足（至少 6 個字元）';
                    break;
            }
            return { success: false, user: null, message };
        }
    },

    /**
     * 使用 Email/Password 登入
     */
    loginWithEmail: async (email: string, password: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return {
                success: true,
                user: userCredential.user,
                message: '登入成功'
            };
        } catch (error: any) {
            let message = '登入失敗';
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    message = '帳號或密碼錯誤';
                    break;
                case 'auth/invalid-email':
                    message = 'Email 格式不正確';
                    break;
                case 'auth/too-many-requests':
                    message = '登入嘗試次數過多，請稍後再試';
                    break;
            }
            return { success: false, user: null, message };
        }
    },

    /**
     * 使用 Google 登入
     */
    loginWithGoogle: async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return {
                success: true,
                user: result.user,
                message: 'Google 登入成功'
            };
        } catch (error: any) {
            let message = 'Google 登入失敗';
            if (error.code === 'auth/popup-closed-by-user') {
                message = '登入視窗被關閉';
            }
            return { success: false, user: null, message };
        }
    },

    /**
     * 登出
     */
    logout: async () => {
        try {
            await signOut(auth);
            return { success: true, message: '已登出' };
        } catch (error) {
            return { success: false, message: '登出失敗' };
        }
    },

    /**
     * 重新發送驗證信
     */
    resendVerificationEmail: async () => {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, message: '請先登入' };
        }

        if (user.emailVerified) {
            return { success: false, message: 'Email 已驗證' };
        }

        try {
            // 使用後端 API 發送自訂驗證信 - VITE_API_URL 不含 /api/v1
            const API_URL = `${import.meta.env.VITE_API_URL || 'https://light-keepers-api-bsf4y44tja-de.a.run.app'}/api/v1`;
            const response = await fetch(`${API_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, displayName: user.displayName }),
            });

            if (response.ok) {
                return { success: true, message: '驗證信已重新發送' };
            }

            // 如果後端失敗，回傳錯誤而非使用 Firebase fallback
            return { success: false, message: '發送失敗，請稍後再試' };
        } catch (error: any) {
            return { success: false, message: '發送失敗，請檢查網路連線' };
        }
    },

    /**
     * 發送密碼重設信
     */
    sendPasswordReset: async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email, {
                url: `${window.location.origin}/login`,
                handleCodeInApp: true,
            });
            return { success: true, message: '密碼重設信已發送' };
        } catch (error: any) {
            let message = '發送失敗';
            if (error.code === 'auth/user-not-found') {
                message = '查無此 Email';
            }
            return { success: false, message };
        }
    },

    /**
     * 檢查 Email 是否已驗證
     */
    isEmailVerified: async (): Promise<boolean> => {
        const user = auth.currentUser;
        if (!user) return false;

        // 重新載入使用者狀態以獲取最新驗證狀態
        await user.reload();
        return user.emailVerified;
    },

    /**
     * 取得 Firebase ID Token（用於後端驗證）
     */
    getIdToken: async (): Promise<string | null> => {
        const user = auth.currentUser;
        if (!user) return null;

        try {
            return await user.getIdToken();
        } catch (error) {
            console.error('Failed to get ID token:', error);
            return null;
        }
    },

    /**
     * 將現有 Email/Password 帳號綁定到當前使用者
     */
    linkEmailPassword: async (email: string, password: string) => {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, message: '請先登入' };
        }

        try {
            const credential = EmailAuthProvider.credential(email, password);
            await linkWithCredential(user, credential);
            return { success: true, message: 'Email 已綁定' };
        } catch (error: any) {
            return { success: false, message: '綁定失敗: ' + error.message };
        }
    },
};

export { auth };
export type { User };
