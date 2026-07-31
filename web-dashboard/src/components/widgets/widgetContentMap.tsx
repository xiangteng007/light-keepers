/**
 * widgetContentMap.tsx
 *
 * Public entry point of the widget content system.
 *
 * `WIDGET_CONTENT_MAP` keeps the exact shape the widget grid expects
 * (`Record<widgetId, ReactNode>`), but each node is now a Suspense-wrapped
 * lazy loader instead of an eagerly-evaluated element tree — so widget code
 * lives in per-domain async chunks rather than the first-load bundle.
 *
 * Imported directly (not via the `widgets/index.ts` barrel) to keep the
 * unrelated dashboard widgets out of the first-load graph.
 */
import type { ReactNode } from 'react';
import { LazyWidgetContent } from './LazyWidgetContent';
import { REGISTERED_WIDGET_IDS } from './widgetRegistry';

export const WIDGET_CONTENT_MAP: Record<string, ReactNode> = Object.fromEntries(
    REGISTERED_WIDGET_IDS.map((widgetId) => [
        widgetId,
        <LazyWidgetContent key={widgetId} widgetId={widgetId} />,
    ]),
);

export { LazyWidgetContent } from './LazyWidgetContent';
export { WidgetContentSkeleton } from './WidgetContentSkeleton';
export { WIDGET_REGISTRY, REGISTERED_WIDGET_IDS, hasWidgetContent } from './widgetRegistry';
