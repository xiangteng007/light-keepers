/**
 * B3c icon 集 — 社群/照護組（R5/T5b）
 * 幾何規則見 IconBase.tsx 與 icons/README.md。
 * 稜角心形與 field.tsx 的 aed 同族（aed＝心＋電擊，heart＝純心）。
 */
import { createIcon } from './IconBase';

/** heart 心 — 稜角心形（aed 同族，去電擊閃電） */
export const HeartIcon = createIcon(
    'HeartIcon',
    <path d="M12 21L4 14V6l4-2 4 3 4-3 4 2v8z" />,
);

/** support 互助 — 雙手承托＋稜角小心形（雙手幾何化） */
export const SupportIcon = createIcon(
    'SupportIcon',
    <>
        <path d="M2 11v6l4 4h5" />
        <path d="M22 11v6l-4 4h-5" />
        <path d="M12 10L8 7V4l2-1 2 2 2-2 2 1v3z" />
    </>,
);

/** trophy 獎盃 — 稜角盃體＋雙直角耳＋柱＋座 */
export const TrophyIcon = createIcon(
    'TrophyIcon',
    <>
        <path d="M7 3h10v7l-3 4h-4L7 10z" />
        <path d="M7 5H4v4h3M17 5h3v4h-3" />
        <path d="M12 14v4" />
        <rect x="8" y="18" width="8" height="3" />
    </>,
);

/** graduation 結業 — 方帽帽板（菱形）＋帽箍＋流蘇方點 */
export const GraduationIcon = createIcon(
    'GraduationIcon',
    <>
        <path d="M12 4L2 9l10 5 10-5z" />
        <path d="M6 11v4l6 3 6-3v-4" />
        <path d="M22 9v5m0 2v.01" />
    </>,
);
