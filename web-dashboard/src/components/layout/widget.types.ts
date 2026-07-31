/**
 * Widget Layout System - barrel
 *
 * The definitions used to live in this single 631-line file; they are now
 * split by concern under `./widget/` (core types, defaults, picker modules,
 * per-domain page configs). This barrel keeps every existing import path
 * (`./widget.types`) working unchanged.
 */
export type {
    WidgetSize,
    WidgetPosition,
    WidgetConfig,
    LayoutConfig,
    WidgetEditState,
    WidgetModule,
} from './widget/types';
export { PermissionLevel } from './widget/types';

export { DEFAULT_WIDGETS } from './widget/defaults';
export { AVAILABLE_WIDGET_MODULES } from './widget/modules';
export { PAGE_WIDGET_CONFIGS } from './widget/pageConfigs';
