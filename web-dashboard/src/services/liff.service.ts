import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

interface LiffProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
}

interface LiffService {
    isInitialized: boolean;
    isInClient: boolean;
    isLoggedIn: boolean;
    init: () => Promise<boolean>;
    login: () => void;
    logout: () => void;
    getProfile: () => Promise<LiffProfile | null>;
    getAccessToken: () => string | null;
    getIDToken: () => string | null;
    isInLineApp: () => boolean;
    closeWindow: () => void;
}

class LiffServiceImpl implements LiffService {
    isInitialized = false;
    isInClient = false;
    isLoggedIn = false;

    /**
     * 初始化 LIFF SDK
     * @returns Promise<boolean> - 初始化是否成功
     */
    async init(): Promise<boolean> {
        if (!LIFF_ID) {
            console.warn('LIFF_ID not configured, LIFF features disabled');
            return false;
        }

        if (this.isInitialized) {
            return true;
        }

        try {
            await liff.init({ liffId: LIFF_ID });
            this.isInitialized = true;
            this.isInClient = liff.isInClient();
            this.isLoggedIn = liff.isLoggedIn();

            console.log('LIFF initialized:', {
                inClient: this.isInClient,
                loggedIn: this.isLoggedIn,
            });

            return true;
        } catch (error) {
            console.error('LIFF init failed:', error);
            return false;
        }
    }

    /**
     * 觸發 LINE 登入
     * 在 LINE App 內 (LIFF) 會自動登入
     * 在瀏覽器會跳轉到 LINE 登入頁面
     */
    login(): void {
        if (!this.isInitialized) {
            console.error('LIFF not initialized');
            return;
        }

        if (!this.isLoggedIn) {
            liff.login({
                redirectUri: window.location.href,
            });
        }
    }

    /**
     * 登出
     */
    logout(): void {
        if (this.isInitialized && this.isLoggedIn) {
            liff.logout();
            this.isLoggedIn = false;
        }
    }

    /**
     * 取得使用者 Profile
     */
    async getProfile(): Promise<LiffProfile | null> {
        if (!this.isInitialized || !this.isLoggedIn) {
            return null;
        }

        try {
            const profile = await liff.getProfile();
            return profile;
        } catch (error) {
            console.error('Failed to get LIFF profile:', error);
            return null;
        }
    }

    /**
     * 取得 Access Token (用於後端驗證)
     */
    getAccessToken(): string | null {
        if (!this.isInitialized || !this.isLoggedIn) {
            return null;
        }
        return liff.getAccessToken();
    }

    /**
     * 取得 ID Token (包含使用者資訊的 JWT)
     */
    getIDToken(): string | null {
        if (!this.isInitialized || !this.isLoggedIn) {
            return null;
        }
        return liff.getIDToken();
    }

    /**
     * 檢查是否在 LINE App 內執行
     */
    isInLineApp(): boolean {
        return this.isInClient;
    }

    /**
     * 關閉 LIFF 視窗 (僅在 LINE App 內有效)
     */
    closeWindow(): void {
        if (this.isInClient) {
            liff.closeWindow();
        }
    }
}

export const liffService = new LiffServiceImpl();
export type { LiffProfile };
