/**
 * Jest 全域環境設定（unit test）
 *
 * JWT 密鑰在程式碼中已改為 fail-fast（缺少 JWT_SECRET 就 throw），
 * 測試環境不會掛載真實 secret，因此在此補上僅供測試使用的假密鑰。
 * 注意：這個值只在 jest process 中存在，不會進入任何建置產物。
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-only-jwt-secret-do-not-use-in-any-real-environment';
