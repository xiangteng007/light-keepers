/**
 * B3c 圖文系統 — 主題化象形與狀態章（R5/T5）
 * ---------------------------------------------------------------------------
 * 出口三組：
 *   1. 災型象形 12 枚＋disasterPictogramRegistry（key 對齊 ReportType SSOT）
 *   2. START 傷檢分級章 4 枚＋triageStampRegistry（RED/YELLOW/GREEN/BLACK）
 *   3. 通用狀態章 5 枚（■ □ ✓ ▲ ● 的像素對齊元件版）
 * 全部元件只畫形，色由 currentColor 繼承；語意色由使用端以 token 指定。
 */
export type { PictogramProps } from './types';

export {
    EarthquakePictogram,
    FloodPictogram,
    FirePictogram,
    TyphoonPictogram,
    LandslidePictogram,
    TrafficPictogram,
    InfrastructurePictogram,
    OtherPictogram,
    AirRaidPictogram,
    ExplosionPictogram,
    TerrorAttackPictogram,
    CbrnPictogram,
    disasterPictogramRegistry,
} from './DisasterPictograms';

export {
    TriageImmediateStamp,
    TriageDelayedStamp,
    TriageMinorStamp,
    TriageExpectantStamp,
    triageStampRegistry,
    type TriageLevelKey,
} from './TriageStamps';

export {
    SolidSquareStamp,
    OutlineSquareStamp,
    CheckStamp,
    TriangleStamp,
    DotStamp,
} from './StatusStamps';
