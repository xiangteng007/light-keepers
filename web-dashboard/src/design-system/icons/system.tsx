/**
 * B3c icon 集 — 系統/安全組（R5/T5b）
 * 幾何規則見 IconBase.tsx 與 icons/README.md。
 * 弧形概念（鎖弓、指紋同心弧、脈搏波）一律直角折線重譯。
 */
import { createIcon } from './IconBase';

/** lock 上鎖 — 方鎖體＋直角鎖弓＋鑰匙孔線 */
export const LockIcon = createIcon(
    'LockIcon',
    <>
        <rect x="5" y="11" width="14" height="10" />
        <path d="M8 11V5h8v6" />
        <path d="M12 15v3" />
    </>,
);

/** shield 防護 — 稜角盾＋中線 */
export const ShieldIcon = createIcon(
    'ShieldIcon',
    <>
        <path d="M4 5l8-3 8 3v7l-8 9-8-9z" />
        <path d="M12 6v10" />
    </>,
);

/** fingerprint 指紋 — 同心弧直角重譯：巢狀直角拱＋斷紋中線 */
export const FingerprintIcon = createIcon(
    'FingerprintIcon',
    <>
        <path d="M4 21V7l3-3h10l3 3v14" />
        <path d="M8 21V10l2-2h4l2 2v11" />
        <path d="M12 21v-3m0-3v-3" />
    </>,
);

/** ai AI — 腦/電路幾何：直角顱形＋分岔電路 */
export const AiIcon = createIcon(
    'AiIcon',
    <>
        <path d="M8 3h8l4 4v6l-4 4v4H8v-4l-4-4V7z" />
        <path d="M12 17v-5h-4M12 12h4v-4" />
    </>,
);

/** bot 機器人 — 方首＋天線方點＋眼縫＋側耳 */
export const BotIcon = createIcon(
    'BotIcon',
    <>
        <rect x="5" y="9" width="14" height="11" />
        <path d="M12 9V5m0-2v.01" />
        <path d="M9 13v3M15 13v3" />
        <path d="M2 14h3M19 14h3" />
    </>,
);

/** flask 燒瓶 — 稜角錐形瓶＋瓶口＋液面線（演練/實驗） */
export const FlaskIcon = createIcon(
    'FlaskIcon',
    <>
        <path d="M10 3v6L4 20h16L14 9V3" />
        <path d="M8 3h8" />
        <path d="M7 15h10" />
    </>,
);

/** monitor 監測 — 脈搏折線（EFIS 波形直角重譯） */
export const MonitorIcon = createIcon(
    'MonitorIcon',
    <path d="M2 13h5l3-8 4 14 3-6h5" />,
);

/** webhook 節點連線 — 主節點 45° 下分雙節點 */
export const WebhookIcon = createIcon(
    'WebhookIcon',
    <>
        <rect x="10" y="3" width="4" height="4" />
        <rect x="4" y="16" width="4" height="4" />
        <rect x="16" y="16" width="4" height="4" />
        <path d="M12 7v4" />
        <path d="M12 11l-5 5M12 11l5 5" />
    </>,
);

/** merge 匯流 — 雙流 45° 匯入單向箭 */
export const MergeIcon = createIcon(
    'MergeIcon',
    <>
        <path d="M2 6h4l6 6" />
        <path d="M2 18h4l6-6" />
        <path d="M12 12h9" />
        <path d="M17 8l4 4-4 4" />
    </>,
);
