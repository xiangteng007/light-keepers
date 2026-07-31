/**
 * DevMode Gate — DEV builds only
 *
 * 背景（XC-1 安全修復）：
 * 先前各處直接讀 `localStorage.getItem('devModeUser')`，且該判斷會被打包進
 * production bundle。任何人只要在瀏覽器 console 執行
 *   localStorage.setItem('devModeUser', 'true')
 * 就能讓前端把自己當成 Level 5「系統擁有者」——繞過 ProtectedRoute、
 * 側邊欄權限過濾與登入 Modal。（後端仍會擋 API，但前端權限顯示完全失守。）
 *
 * 修法：所有 devMode 判斷一律走這個唯一入口，並以 `import.meta.env.DEV`
 * 作為短路條件。Vite 在 production build 會把 `import.meta.env.DEV`
 * 靜態替換成 `false`，`false && ...` 被常數摺疊為 `false`，
 * 整段 localStorage 讀取會被 tree-shaking 移除 —— production bundle
 * 中不存在 'devModeUser' 這個字串，後門無法被觸發。
 *
 * 使用方式（僅開發環境有效）：
 *   localStorage.setItem('devModeUser', 'true')
 */

/** localStorage key（僅開發環境有意義） */
export const DEV_MODE_KEY = 'devModeUser';

/**
 * 是否啟用 DevMode（模擬 Level 5 使用者、跳過認證）。
 *
 * production build 恆為 `false`，且判斷邏輯會被 tree-shaking 完全移除。
 */
export const isDevModeUser = (): boolean =>
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    localStorage.getItem(DEV_MODE_KEY) === 'true';

export default isDevModeUser;
