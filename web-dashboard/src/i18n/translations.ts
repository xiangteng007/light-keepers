/**
 * Internationalization (i18n) Configuration
 * 
 * Multi-language support for zh-TW, en-US, ja-JP
 */

export type Locale = 'zh-TW' | 'en-US' | 'ja-JP';

export const DEFAULT_LOCALE: Locale = 'zh-TW';

export const SUPPORTED_LOCALES: Locale[] = ['zh-TW', 'en-US', 'ja-JP'];

/**
 * Translation dictionary type
 */
export type TranslationKey = keyof typeof translations['zh-TW'];

/**
 * All translations
 */
export const translations = {
    'zh-TW': {
        // Common
        'common.loading': '載入中...',
        'common.save': '儲存',
        'common.cancel': '取消',
        'common.delete': '刪除',
        'common.edit': '編輯',
        'common.create': '新增',
        'common.search': '搜尋',
        'common.filter': '篩選',
        'common.refresh': '重新整理',
        'common.back': '返回',
        'common.next': '下一步',
        'common.previous': '上一步',
        'common.confirm': '確認',
        'common.success': '成功',
        'common.error': '錯誤',
        'common.warning': '警告',
        
        // Auth
        'auth.login': '登入',
        'auth.logout': '登出',
        'auth.email': '電子郵件',
        'auth.password': '密碼',
        'auth.forgotPassword': '忘記密碼',
        'auth.register': '註冊',
        
        // Navigation
        'nav.dashboard': '儀表板',
        'nav.missions': '任務管理',
        'nav.tasks': '工作項目',
        'nav.volunteers': '志工管理',
        'nav.resources': '物資管理',
        'nav.reports': '現場報告',
        'nav.maps': '戰術地圖',
        'nav.settings': '設定',
        
        // Tasks
        'task.status.pending': '待處理',
        'task.status.inProgress': '進行中',
        'task.status.completed': '已完成',
        'task.status.cancelled': '已取消',
        'task.priority.low': '低',
        'task.priority.medium': '中',
        'task.priority.high': '高',
        'task.priority.critical': '緊急',
        
        // Triage
        'triage.red': '紅色 - 立即處理',
        'triage.yellow': '黃色 - 延遲處理',
        'triage.green': '綠色 - 輕傷',
        'triage.black': '黑色 - 無生命跡象',
        
        // Offline
        'offline.indicator': '離線模式',
        'offline.syncPending': '{count} 項待同步',
        'offline.syncing': '同步中...',
        'offline.syncComplete': '同步完成',
        
        // Errors
        'error.network': '網路連線失敗',
        'error.unauthorized': '未授權存取',
        'error.notFound': '找不到資源',
        'error.serverError': '伺服器錯誤',
    },
    'en-US': {
        // Common
        'common.loading': 'Loading...',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.refresh': 'Refresh',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.previous': 'Previous',
        'common.confirm': 'Confirm',
        'common.success': 'Success',
        'common.error': 'Error',
        'common.warning': 'Warning',
        
        // Auth
        'auth.login': 'Login',
        'auth.logout': 'Logout',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.forgotPassword': 'Forgot Password',
        'auth.register': 'Register',
        
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.missions': 'Missions',
        'nav.tasks': 'Tasks',
        'nav.volunteers': 'Volunteers',
        'nav.resources': 'Resources',
        'nav.reports': 'Field Reports',
        'nav.maps': 'Tactical Maps',
        'nav.settings': 'Settings',
        
        // Tasks
        'task.status.pending': 'Pending',
        'task.status.inProgress': 'In Progress',
        'task.status.completed': 'Completed',
        'task.status.cancelled': 'Cancelled',
        'task.priority.low': 'Low',
        'task.priority.medium': 'Medium',
        'task.priority.high': 'High',
        'task.priority.critical': 'Critical',
        
        // Triage
        'triage.red': 'Red - Immediate',
        'triage.yellow': 'Yellow - Delayed',
        'triage.green': 'Green - Minor',
        'triage.black': 'Black - Deceased',
        
        // Offline
        'offline.indicator': 'Offline Mode',
        'offline.syncPending': '{count} items pending sync',
        'offline.syncing': 'Syncing...',
        'offline.syncComplete': 'Sync Complete',
        
        // Errors
        'error.network': 'Network connection failed',
        'error.unauthorized': 'Unauthorized access',
        'error.notFound': 'Resource not found',
        'error.serverError': 'Server error',
    },
    'ja-JP': {
        // Common
        'common.loading': '読み込み中...',
        'common.save': '保存',
        'common.cancel': 'キャンセル',
        'common.delete': '削除',
        'common.edit': '編集',
        'common.create': '作成',
        'common.search': '検索',
        'common.filter': 'フィルター',
        'common.refresh': '更新',
        'common.back': '戻る',
        'common.next': '次へ',
        'common.previous': '前へ',
        'common.confirm': '確認',
        'common.success': '成功',
        'common.error': 'エラー',
        'common.warning': '警告',
        
        // Auth
        'auth.login': 'ログイン',
        'auth.logout': 'ログアウト',
        'auth.email': 'メールアドレス',
        'auth.password': 'パスワード',
        'auth.forgotPassword': 'パスワードを忘れた',
        'auth.register': '登録',
        
        // Navigation
        'nav.dashboard': 'ダッシュボード',
        'nav.missions': 'ミッション',
        'nav.tasks': 'タスク',
        'nav.volunteers': 'ボランティア',
        'nav.resources': 'リソース',
        'nav.reports': '現場報告',
        'nav.maps': '戦術マップ',
        'nav.settings': '設定',
        
        // Tasks
        'task.status.pending': '保留中',
        'task.status.inProgress': '進行中',
        'task.status.completed': '完了',
        'task.status.cancelled': 'キャンセル',
        'task.priority.low': '低',
        'task.priority.medium': '中',
        'task.priority.high': '高',
        'task.priority.critical': '緊急',
        
        // Triage
        'triage.red': '赤 - 即時対応',
        'triage.yellow': '黄 - 遅延対応',
        'triage.green': '緑 - 軽傷',
        'triage.black': '黒 - 死亡',
        
        // Offline
        'offline.indicator': 'オフラインモード',
        'offline.syncPending': '{count} 件の同期待ち',
        'offline.syncing': '同期中...',
        'offline.syncComplete': '同期完了',
        
        // Errors
        'error.network': 'ネットワーク接続に失敗しました',
        'error.unauthorized': '権限がありません',
        'error.notFound': 'リソースが見つかりません',
        'error.serverError': 'サーバーエラー',
    },
} as const;

/**
 * Get translation by key
 */
export function t(key: TranslationKey, locale: Locale = DEFAULT_LOCALE, params?: Record<string, string | number>): string {
    let text: string = translations[locale]?.[key] || translations[DEFAULT_LOCALE][key] || key;
    
    // Replace parameters
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, String(v));
        });
    }
    
    return text;
}

/**
 * Get browser's preferred locale
 */
export function detectLocale(): Locale {
    const browserLang = navigator.language;
    
    if (browserLang.startsWith('zh')) return 'zh-TW';
    if (browserLang.startsWith('ja')) return 'ja-JP';
    if (browserLang.startsWith('en')) return 'en-US';
    
    return DEFAULT_LOCALE;
}

/**
 * Format date for locale
 */
export function formatDate(date: Date, locale: Locale): string {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}

/**
 * Format number for locale
 */
export function formatNumber(num: number, locale: Locale): string {
    return new Intl.NumberFormat(locale).format(num);
}
