/**
 * B3c 野戰手冊 icon 集 — 統一出口（R5/T5）
 *
 * 用法：
 *   import { MapIcon } from '@/design-system/icons';        // 具名元件
 *   import { iconRegistry } from '@/design-system/icons';    // 語意名查表
 *   const Icon = iconRegistry['map'];
 *
 * 文法與命名規則見 icons/README.md。本檔只做輸出與註冊，不放幾何。
 */
export type { LkIconProps, LkIcon } from './IconBase';
export { createIcon } from './IconBase';

export * from './nav';
export * from './field';
export * from './status';
export * from './action';
export * from './chevron';

import type { LkIcon } from './IconBase';
import {
    CommandIcon,
    MapIcon,
    TasksIcon,
    ReportIcon,
    TriageIcon,
    InventoryIcon,
    TeamsIcon,
    EventsIcon,
    AnalyticsIcon,
    SettingsIcon,
} from './nav';
import {
    ShelterIcon,
    AedIcon,
    WarehouseIcon,
    DroneIcon,
    RadioIcon,
    SosIcon,
    LocationIcon,
    CameraIcon,
    MicIcon,
    QrIcon,
} from './field';
import {
    NotifyIcon,
    WarningIcon,
    InfoIcon,
    ClockIcon,
    SyncIcon,
    OnlineIcon,
    OfflineIcon,
} from './status';
import {
    SearchIcon,
    LayersIcon,
    EditIcon,
    CloseIcon,
    CheckIcon,
    PlusIcon,
    MinusIcon,
    FilterIcon,
    ExportIcon,
    UserIcon,
    LogoutIcon,
} from './action';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    ChevronDownIcon,
} from './chevron';

/**
 * 語意名 → 元件 查表。
 * key 使用 kebab-case 語意名（與導覽/頁面 policy 的語意 id 對齊），
 * 供 navigation config、動態渲染等以字串取用 icon。
 */
export const iconRegistry: Record<string, LkIcon> = {
    // 導覽/旗艦頁
    'command': CommandIcon,
    'map': MapIcon,
    'tasks': TasksIcon,
    'report': ReportIcon,
    'triage': TriageIcon,
    'inventory': InventoryIcon,
    'teams': TeamsIcon,
    'events': EventsIcon,
    'analytics': AnalyticsIcon,
    'settings': SettingsIcon,
    // 野戰/設施
    'shelter': ShelterIcon,
    'aed': AedIcon,
    'warehouse': WarehouseIcon,
    'drone': DroneIcon,
    'radio': RadioIcon,
    'sos': SosIcon,
    'location': LocationIcon,
    'camera': CameraIcon,
    'mic': MicIcon,
    'qr': QrIcon,
    // 狀態/告警
    'notify': NotifyIcon,
    'warning': WarningIcon,
    'info': InfoIcon,
    'clock': ClockIcon,
    'sync': SyncIcon,
    'online': OnlineIcon,
    'offline': OfflineIcon,
    // 操作/工具
    'search': SearchIcon,
    'layers': LayersIcon,
    'edit': EditIcon,
    'close': CloseIcon,
    'check': CheckIcon,
    'plus': PlusIcon,
    'minus': MinusIcon,
    'filter': FilterIcon,
    'export': ExportIcon,
    'user': UserIcon,
    'logout': LogoutIcon,
    // 方向
    'chevron-left': ChevronLeftIcon,
    'chevron-right': ChevronRightIcon,
    'chevron-up': ChevronUpIcon,
    'chevron-down': ChevronDownIcon,
};
