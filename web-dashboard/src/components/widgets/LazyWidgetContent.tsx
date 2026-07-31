/**
 * LazyWidgetContent.tsx
 *
 * Renders a registered widget's content, suspended on its async chunk.
 * Unknown widget ids render nothing (same as the previous content map,
 * where a missing key simply produced an empty widget body).
 */
import { Suspense } from 'react';
import { WIDGET_REGISTRY } from './widgetRegistry';
import { WidgetContentSkeleton } from './WidgetContentSkeleton';

interface LazyWidgetContentProps {
    widgetId: string;
}

export function LazyWidgetContent({ widgetId }: LazyWidgetContentProps) {
    const Content = WIDGET_REGISTRY[widgetId];
    if (!Content) return null;

    return (
        <Suspense fallback={<WidgetContentSkeleton />}>
            <Content />
        </Suspense>
    );
}

export default LazyWidgetContent;
