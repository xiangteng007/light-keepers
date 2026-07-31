/**
 * Public Decorator (相容層 / compatibility re-export)
 *
 * 這個檔案原本重複定義了一份 @Public()，與
 * `src/modules/shared/guards/public.decorator.ts` 使用相同的 metadata key
 * ('isPublic')。1.6 guard 收斂已將定義收斂到 shared 版本，此處僅保留
 * re-export，讓既有的 import 路徑維持相容。
 *
 * 新程式碼請直接改用：
 *   import { Public } from '../shared/guards';
 *
 * 語意（由 shared 版本提供）：
 * - 標記端點為刻意公開（不需要認證）。所有公開端點都必須明確標註此裝飾器，
 *   「沒有掛 guard」不是可接受的做法。
 * - Policy: 所有 @Public 端點都應同時設定 @Throttle 做流量限制。
 *
 * @see src/modules/shared/guards/public.decorator.ts
 * @see docs/proof/security/public-surface.md 可稽核的公開端點清單
 */

export { Public, IS_PUBLIC_KEY } from '../../shared/guards/public.decorator';
