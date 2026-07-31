/**
 * 敏感個資欄位清單與遮罩規則 (F-M2)
 *
 * 對應 docs/audit/04-security-and-governance.md「資料保護 / 敏感資料遮罩實作」：
 * roleLevel < 3 的使用者讀取「他人」個資時，身分證／電話／地址／生日／Email 必須遮罩。
 *
 * ⚠️ 這份清單是遮罩策略的單一事實來源（SSOT）。
 * 新增含個資的 entity／DTO 欄位時，請一併在此登記，不要在 controller / service 內散寫遮罩邏輯。
 *
 * 欄位名稱以「正規化形式」比對（移除底線與連字號後轉小寫），
 * 因此 `idNumber`、`id_number`、`ID_NUMBER` 共用同一條規則，
 * 不需要為 camelCase / snake_case 各登記一次。
 */

/** 遮罩類型 */
export type SensitiveMaskType =
    | 'idNumber'
    | 'phone'
    | 'address'
    | 'email'
    | 'birthDate'
    | 'personName';

/**
 * 需要遮罩的最低權限等級。
 * roleLevel >= 3（常務理事 DIRECTOR）視為有權讀取完整個資，不遮罩。
 */
export const SENSITIVE_MASK_MIN_ROLE_LEVEL = 3;

/**
 * 「本人資料」判定欄位。
 * 回應物件上任一欄位命中且值等於呼叫者的 account id 時，該物件（含其子樹）不遮罩。
 * 值以正規化形式登記。
 */
export const SELF_IDENTITY_FIELDS: ReadonlySet<string> = new Set([
    'id',        // Account entity 主鍵即為 JWT sub
    'sub',
    'uid',
    'userid',
    'accountid',
    'ownerid',
]);

/**
 * 敏感欄位分類清單。
 *
 * 盤點來源（以實際 schema 為準，非臆測）：
 * - volunteers.entity.ts        : idNumber / birthDate / phone / email / address /
 *                                 emergencyContactName / emergencyContactPhone
 * - accounts/entities/account.entity.ts : email / phone / googleEmail
 * - shelters/entities/shelter.entity.ts : address / contactPhone（Shelter）、
 *                                 idNumber / phone / emergencyContact / emergencyPhone（ShelterEvacuee）
 * - reunification/entities/missing-person.entity.ts : contactPhone / reporterPhone
 * - intake/entities/intake-report.entity.ts : reporterPhone
 * - 其餘模組共用的 contactPhone / contactEmail / address 亦一併涵蓋
 *
 * 刻意「不」列入的欄位：
 * - `name` / `displayName` / `reporterName`：主體姓名是各列表與派遣作業的必要識別資訊，
 *   遮罩會破壞第一線可用性；audit F-M2 也未要求。僅緊急聯絡人姓名納入遮罩。
 * - `queryCode`：家屬憑碼查詢用的功能性識別碼，遮罩會使查詢功能失效。
 * - `latitude` / `longitude`：座標降精度屬另一項工作（audit 表列為「精度降低」），
 *   語意與字串遮罩不同，不在本攔截器處理。
 */
export const SENSITIVE_FIELD_GROUPS: Readonly<Record<SensitiveMaskType, readonly string[]>> = {
    // 身分證字號 / 護照號
    idNumber: [
        'idNumber',
        'id_number',
        'nationalId',
        'national_id',
        'passportNumber',
        'passportNo',
    ],
    // 電話（本人與緊急聯絡人）
    phone: [
        'phone',
        'phoneNumber',
        'mobile',
        'mobileNumber',
        'telephone',
        'contactPhone',
        'reporterPhone',
        'emergencyPhone',
        'emergencyContactPhone',
    ],
    // 地址
    address: [
        'address',
        'homeAddress',
        'contactAddress',
        'residentialAddress',
    ],
    // Email
    email: [
        'email',
        'contactEmail',
        'personalEmail',
        'googleEmail',
    ],
    // 生日
    birthDate: [
        'birthDate',
        'birthday',
        'dateOfBirth',
        'dob',
    ],
    // 緊急聯絡人姓名（ShelterEvacuee.emergencyContact 儲存的是聯絡人姓名）
    personName: [
        'emergencyContact',
        'emergencyContactName',
    ],
};

/**
 * 欄位名稱正規化：移除底線／連字號後轉小寫。
 * `emergency_contact_phone` 與 `emergencyContactPhone` 會正規化為同一個 key。
 */
export function normalizeFieldName(field: string): string {
    return field.replace(/[_-]/g, '').toLowerCase();
}

/** 正規化欄位名 -> 遮罩類型 */
const SENSITIVE_FIELD_MAP: ReadonlyMap<string, SensitiveMaskType> = (() => {
    const map = new Map<string, SensitiveMaskType>();
    for (const [maskType, fields] of Object.entries(SENSITIVE_FIELD_GROUPS)) {
        for (const field of fields) {
            map.set(normalizeFieldName(field), maskType as SensitiveMaskType);
        }
    }
    return map;
})();

/** 查詢某個欄位名稱對應的遮罩類型；非敏感欄位回傳 undefined */
export function getSensitiveMaskType(field: string): SensitiveMaskType | undefined {
    return SENSITIVE_FIELD_MAP.get(normalizeFieldName(field));
}

/** 目前登記的敏感欄位總數（供測試與稽核報表使用） */
export function getSensitiveFieldCount(): number {
    return SENSITIVE_FIELD_MAP.size;
}

// ============================================================
// 遮罩函式
// ============================================================

function toText(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'bigint') return String(value);
    return '';
}

function extractYear(value: unknown): string | null {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return String(value.getUTCFullYear()).padStart(4, '0');
    }
    const match = toText(value).match(/\d{4}/);
    return match ? match[0] : null;
}

/**
 * 遮罩規則實作。
 *
 * - phone     : 保留首二末一，10 碼手機採固定分組 `09**-***-**8`
 * - idNumber  : 首字 + `****`，例 `A****`
 * - address   : 保留到「區／鄉／鎮」層級，例 `台北市大安區***`
 * - email     : 首字 + `***@domain`，例 `a***@example.com`
 * - birthDate : 只保留年份，例 `1990-**-**`
 * - personName: 首字 + `*`，例 `王**`
 */
export const SENSITIVE_MASKERS: Readonly<Record<SensitiveMaskType, (value: unknown) => string>> = {
    idNumber: (value) => {
        const text = toText(value);
        if (!text) return text;
        return `${text[0]}****`;
    },

    phone: (value) => {
        const text = toText(value);
        if (!text) return text;
        // 太短的值無法保留首二末一而不洩漏，整串遮蔽
        if (text.length <= 3) return '*'.repeat(text.length);
        const head = text.slice(0, 2);
        const tail = text.slice(-1);
        // 台灣手機號碼（10 碼）使用可讀性較好的固定分組格式
        if (text.length === 10) return `${head}**-***-**${tail}`;
        return `${head}${'*'.repeat(text.length - 3)}${tail}`;
    },

    address: (value) => {
        const text = toText(value);
        if (!text) return text;
        // 縣市 + 區/鄉/鎮，例「台北市大安區」「花蓮縣光復鄉」
        const cityDistrict = text.match(/^(.{1,4}?[縣市])(.{1,5}?[區鄉鎮市])/);
        if (cityDistrict) return `${cityDistrict[1]}${cityDistrict[2]}***`;
        // 只找得到單一層級（例「花蓮縣」或直接以「大安區」開頭）
        const singleLevel = text.match(/^.{1,5}?[縣市區鄉鎮]/);
        if (singleLevel) return `${singleLevel[0]}***`;
        // 非台灣地址格式：保留前 3 字元
        return `${text.slice(0, 3)}***`;
    },

    email: (value) => {
        const text = toText(value);
        if (!text) return text;
        const atIndex = text.indexOf('@');
        if (atIndex < 0) return `${text[0]}***`;
        const local = text.slice(0, atIndex);
        const domain = text.slice(atIndex + 1);
        if (!local) return `***@${domain}`;
        return `${local[0]}***@${domain}`;
    },

    birthDate: (value) => {
        const year = extractYear(value);
        return year ? `${year}-**-**` : '****-**-**';
    },

    personName: (value) => {
        const text = toText(value);
        if (!text) return text;
        if (text.length === 1) return '*';
        return `${text[0]}${'*'.repeat(text.length - 1)}`;
    },
};
