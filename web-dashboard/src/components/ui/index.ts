/**
 * @deprecated 本元件庫已於 FE-2 (redesign plan 2.3) 淘汰。
 * ═══════════════════════════════════════════════════════════════
 *
 * 全站單一元件庫 = `src/design-system`（11 個元件、32 個檔案使用、CSS colocated）。
 * 本 barrel 僅剩 0 個 app 端使用者（原唯一使用者 DashboardPage 已遷移）。
 * 保留檔案以避免破壞任何未被靜態分析捕捉到的引用，但 **請勿新增使用**。
 *
 * ── 遷移對照表 (import { X } from '../components/ui' → '../design-system') ──
 *
 *  Button      → design-system Button
 *                size sm|md|lg 相容；variant primary|secondary|ghost|danger 相容。
 *                ⚠ 無對應：accent（用 primary）、outline（用 secondary）、link（用 ghost）。
 *                ⚠ leftIcon → icon；rightIcon 無對應（需自行放進 children）。
 *  Card        → design-system Card
 *                variant default|elevated|outlined|glass 相容；emergency 無對應（用 outlined）。
 *                interactive → variant="interactive"。
 *                CardHeader/CardBody/CardFooter 三件組 → Card 的
 *                title / subtitle / icon / children / footer / padding props。
 *  Badge       → design-system Badge
 *                safe→success、critical→danger + dot + pulse、neutral→default、
 *                accent→gradient；danger / warning / info / size 相容。
 *                SafeBadge/WarningBadge/DangerBadge/CriticalBadge 便捷元件無對應，
 *                改為直接指定 variant。
 *  Alert       → design-system Alert（variant info|success|warning|danger 相容）
 *                InlineAlert → Alert；ToastAlert → design-system Toast / ToastContainer。
 *  Modal       → design-system Modal（isOpen/onClose/title/size/footer 相容）
 *                ConfirmModal → Modal + 自行組 footer 按鈕（design-system 無對應包裝）。
 *  Input       → design-system InputField（label/helperText/error/prefix/suffix）。
 *                ⚠ Textarea 無對應，需用原生 <textarea> 或新增 design-system 元件。
 *  Skeleton    → **無對應元件**；請沿用 src/index.css 的 `.skeleton` utility class，
 *                或於 design-system 新增後再遷移（見收斂文件「未竟事項」）。
 *
 * ⚠ 注意：本庫與 design-system 產生 **相同的 `.lk-badge` / `.lk-btn` / `.lk-card`
 *   class 名稱**，但樣式分別來自 `styles/tokens/components.css` 與
 *   `design-system/components/＊.css`，兩者 variant 字彙不同且會互相覆蓋。
 *   這是不得混用兩套庫的根本原因。
 *
 * @see docs/architecture/DESIGN_SYSTEM_CONSOLIDATION.md
 */

// Button
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button';

// Card
export { Card, CardHeader, CardBody, CardFooter } from './Card/Card';
export type { CardProps, CardHeaderProps, CardBodyProps } from './Card/Card';

// Badge
export { Badge, SafeBadge, WarningBadge, DangerBadge, CriticalBadge } from './Badge/Badge';
export type { BadgeProps } from './Badge/Badge';

// Skeleton
export { Skeleton, SkeletonCard, SkeletonList, SkeletonTable } from './Skeleton/Skeleton';
export type { default as SkeletonDefault } from './Skeleton/Skeleton';

// Input
export { Input, Textarea } from './Input/Input';
export type { InputProps, TextareaProps, InputVariant, InputSize } from './Input/Input';

// Alert
export { Alert, InlineAlert, ToastAlert } from './Alert/Alert';
export type { AlertProps, AlertVariant, InlineAlertProps, ToastAlertProps } from './Alert/Alert';

// Modal
export { Modal, ConfirmModal } from './Modal/Modal';
export type { ModalProps, ModalSize, ConfirmModalProps } from './Modal/Modal';
