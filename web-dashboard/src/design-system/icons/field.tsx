/**
 * B3c icon 集 — 野戰/設施組（R5/T5）
 * 幾何規則見 IconBase.tsx 與 icons/README.md。
 */
import { createIcon } from './IconBase';

/** shelter 避難所 — 山牆屋形＋門 */
export const ShelterIcon = createIcon(
    'ShelterIcon',
    <>
        <path d="M4 21V10l8-6 8 6v11z" />
        <path d="M10 21v-5h4v5" />
    </>,
);

/** aed AED — 稜角心形＋電擊閃電 */
export const AedIcon = createIcon(
    'AedIcon',
    <>
        <path d="M12 21L4 14V6l4-2 4 3 4-3 4 2v8z" />
        <path d="M13 8l-3 4h4l-3 4" />
    </>,
);

/** warehouse 倉庫 — 斜頂棚架＋捲門橫閂 */
export const WarehouseIcon = createIcon(
    'WarehouseIcon',
    <>
        <path d="M3 21V9l9-5 9 5v12" />
        <path d="M7 21v-7h10v7" />
        <path d="M7 17h10" />
    </>,
);

/** drone 無人機 — 俯視四軸：方形機身＋45°臂＋臂端垂直旋翼刻線 */
export const DroneIcon = createIcon(
    'DroneIcon',
    <>
        <rect x="9" y="9" width="6" height="6" />
        <path d="M5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4 4" />
        <path d="M3 7l4-4M17 3l4 4M3 17l4 4M21 17l-4 4" />
    </>,
);

/** radio 通訊 — 手持無線電：機身＋天線＋面板線 */
export const RadioIcon = createIcon(
    'RadioIcon',
    <>
        <rect x="8" y="8" width="8" height="13" />
        <path d="M10 8V3" />
        <path d="M8 13h8" />
    </>,
);

/** sos SOS — 八角形（停止/求援語義）＋驚嘆號；紅色憲法對象 */
export const SosIcon = createIcon(
    'SosIcon',
    <>
        <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" />
        <path d="M12 8v5" />
        <path d="M12 16v.01" />
    </>,
);

/** location 定位點 — 菱形測位框＋十字刻度＋中心點 */
export const LocationIcon = createIcon(
    'LocationIcon',
    <>
        <path d="M12 5l7 7-7 7-7-7z" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <path d="M12 12v.01" />
    </>,
);

/** camera 相機 — 稜線機身＋方形鏡窗 */
export const CameraIcon = createIcon(
    'CameraIcon',
    <>
        <path d="M3 7h4l2-3h6l2 3h4v13H3z" />
        <rect x="9" y="10" width="6" height="6" />
    </>,
);

/** mic 麥克風 — 方形音頭＋斜角吊架＋立柱底座 */
export const MicIcon = createIcon(
    'MicIcon',
    <>
        <rect x="9" y="3" width="6" height="11" />
        <path d="M5 10v3l4 4h6l4-4v-3" />
        <path d="M12 17v4" />
        <path d="M8 21h8" />
    </>,
);

/** qr QR 碼 — 三定位角＋右下資料塊 */
export const QrIcon = createIcon(
    'QrIcon',
    <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <path d="M14 14h4v4h-4z" />
        <path d="M21 14v.01M14 21h.01M21 21v.01" />
    </>,
);

/** siren 警笛 — 稜角燈罩＋底座＋放射光線（45° 律） */
export const SirenIcon = createIcon(
    'SirenIcon',
    <>
        <path d="M7 21v-8l2-6h6l2 6v8" />
        <path d="M4 21h16" />
        <path d="M12 2v2M5 4l2 2M19 4l-2 2" />
    </>,
);

/** phone 電話 — 45° 斜置聽筒（單筆閉合多邊形，直角重譯） */
export const PhoneIcon = createIcon(
    'PhoneIcon',
    <path d="M3 3h6v4l-2 2 8 8 2-2h4v6h-6L3 9z" />,
);

/** weather 氣象 — 稜角雲體＋45° 雨線 */
export const WeatherIcon = createIcon(
    'WeatherIcon',
    <>
        <path d="M4 16v-3l2-2h3l2-4h5l2 4 2 2v3z" />
        <path d="M9 18l-2 2M14 18l-2 2M19 18l-2 2" />
    </>,
);

/** vehicle 載具 — 方卡車：貨箱＋斜角車頭＋方輪（方點律放大） */
export const VehicleIcon = createIcon(
    'VehicleIcon',
    <>
        <rect x="2" y="6" width="12" height="11" />
        <path d="M14 10h4l3 3v4h-7" />
        <rect x="4" y="17" width="4" height="4" />
        <rect x="15" y="17" width="4" height="4" />
    </>,
);

/** building 建物 — 塔樓＋窗格＋門＋地平線 */
export const BuildingIcon = createIcon(
    'BuildingIcon',
    <>
        <rect x="6" y="3" width="12" height="18" />
        <path d="M9 7h2M13 7h2M9 11h2M13 11h2" />
        <path d="M10 21v-4h4v4" />
        <path d="M3 21h18" />
    </>,
);
