/**
 * B3c icon 集 — 方向組（R5/T5）
 * 四向 chevron，同一支折線的 90° 旋轉族，光學重量完全一致。
 */
import { createIcon } from './IconBase';

/** chevron-left 向左 */
export const ChevronLeftIcon = createIcon(
    'ChevronLeftIcon',
    <path d="M15 5l-7 7 7 7" />,
);

/** chevron-right 向右 */
export const ChevronRightIcon = createIcon(
    'ChevronRightIcon',
    <path d="M9 5l7 7-7 7" />,
);

/** chevron-up 向上 */
export const ChevronUpIcon = createIcon(
    'ChevronUpIcon',
    <path d="M5 15l7-7 7 7" />,
);

/** chevron-down 向下 */
export const ChevronDownIcon = createIcon(
    'ChevronDownIcon',
    <path d="M5 9l7 7 7-7" />,
);
