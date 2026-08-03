/**
 * B3c 野戰手冊 — 地圖符號工廠（R5/T5 主題化圖文系統）
 *
 * MIL-STD-2525 簡化民用版符號的單一事實來源：
 * 每枚符號以幾何 primitive 清單（MapSymbolDefinition.shapes）只定義一次，
 * 同時產出兩種輸出：
 *   1. React 元件 — stroke="currentColor"，色彩由使用端 CSS `color` 決定
 *   2. toDataUri(color) — 序列化為 data:image/svg+xml（encodeURIComponent），
 *      供 MapLibre map.addImage / image source 使用
 *
 * 圖形文法（鐵律）：
 * - viewBox 28×28（地圖符號版；一般 UI icon 為 24×24）
 * - stroke 2、stroke-linecap="square"、stroke-linejoin="miter"
 * - 預設 stroke fill="none"；只有實心變體（solid: true）用 fill
 * - 幾何直角、軍事教範圖例感；禁圓潤有機曲線與裝飾細節
 * - 每枚 3–7 筆畫內完成，一眼可辨勝過精緻
 * - 形狀＝陣營語意（方=我方單位、圓=設施、菱=事件、三角=危害），色由使用端決定
 *   （MIL-STD-2525 形狀＋顏色雙編碼＝色盲安全，見 DESIGN_LANGUAGE.md v2 §C）
 */
import React from 'react';

export const MAP_SYMBOL_VIEWBOX = 28;
export const MAP_SYMBOL_STROKE_WIDTH = 2;

/** 陣營語意（決定外框形狀）：unit=方、facility=圓、incident=菱、hazard=三角 */
export type MapSymbolShapeSemantics = 'unit' | 'facility' | 'incident' | 'hazard';

/**
 * 單一筆畫。attrs 僅使用 React 與原生 SVG 同名的屬性
 * （d、points、cx、cy、r、x、y、width、height、x1、y1、x2、y2），
 * 讓 React 渲染與字串序列化共用同一份資料、不需鍵名轉換。
 */
export interface MapSymbolShape {
    tag: 'path' | 'circle' | 'rect' | 'line' | 'polyline' | 'polygon';
    attrs: Record<string, string | number>;
    /** 實心變體：fill=色、stroke=none（B3c：實心變體才用 fill） */
    solid?: boolean;
}

export interface MapSymbolDefinition {
    /** kebab-case id；同時作為 MapLibre image id 的建議名（前綴 `lk-symbol-`） */
    id: string;
    /** 中文標籤（教範用語） */
    label: string;
    /** 陣營語意，對應外框形狀 */
    shape: MapSymbolShapeSemantics;
    shapes: MapSymbolShape[];
}

export type MapSymbolProps = { size?: number } & React.SVGProps<SVGSVGElement>;

/** 由符號定義產出 React 元件（顏色跟隨 CSS `color` / currentColor） */
export function createMapSymbolComponent(def: MapSymbolDefinition): React.FC<MapSymbolProps> {
    const Component: React.FC<MapSymbolProps> = ({ size = MAP_SYMBOL_VIEWBOX, ...rest }) => (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${MAP_SYMBOL_VIEWBOX} ${MAP_SYMBOL_VIEWBOX}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={MAP_SYMBOL_STROKE_WIDTH}
            strokeLinecap="square"
            strokeLinejoin="miter"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
            {...rest}
        >
            {def.shapes.map((shape, i) =>
                React.createElement(shape.tag, {
                    key: i,
                    ...shape.attrs,
                    ...(shape.solid ? { fill: 'currentColor', stroke: 'none' } : null),
                })
            )}
        </svg>
    );
    Component.displayName = `MapSymbol(${def.id})`;
    return Component;
}

/** 序列化為 SVG 字串（與 React 版共用同一份幾何資料） */
export function mapSymbolToSvgString(def: MapSymbolDefinition, color: string): string {
    // 防禦性處理：color 會進到屬性值，雙引號一律替換，避免破壞 SVG 結構
    const safeColor = color.replace(/"/g, "'");
    const body = def.shapes
        .map((shape) => {
            const attrs: Record<string, string | number> = {
                ...shape.attrs,
                ...(shape.solid ? { fill: safeColor, stroke: 'none' } : null),
            };
            const attrText = Object.entries(attrs)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ');
            return `<${shape.tag} ${attrText}/>`;
        })
        .join('');
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_SYMBOL_VIEWBOX}" height="${MAP_SYMBOL_VIEWBOX}" ` +
        `viewBox="0 0 ${MAP_SYMBOL_VIEWBOX} ${MAP_SYMBOL_VIEWBOX}" fill="none" stroke="${safeColor}" ` +
        `stroke-width="${MAP_SYMBOL_STROKE_WIDTH}" stroke-linecap="square" stroke-linejoin="miter">` +
        `${body}</svg>`
    );
}

/**
 * 產出 toDataUri(color) 工具 — 給 MapLibre image source 用。
 * 以 encodeURIComponent 編碼 SVG 字串（非 base64，除錯時可直接解讀）。
 * 注意：data URI 內無法解析 var(--token)，使用端須先解析出實際色值再傳入。
 */
export function createMapSymbolToDataUri(def: MapSymbolDefinition): (color: string) => string {
    return (color: string) =>
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mapSymbolToSvgString(def, color))}`;
}
