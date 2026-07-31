/**
 * WidgetContentSkeleton.tsx
 *
 * Suspense fallback shown while a widget's async chunk is downloading.
 * Uses the shared design-system Skeleton primitives (shimmer from motion.css).
 */
import { Skeleton } from '../ui/Skeleton/Skeleton';

export function WidgetContentSkeleton() {
    return (
        <div
            className="widget-content-skeleton"
            style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            aria-busy="true"
        >
            <Skeleton variant="title" width="50%" />
            <Skeleton variant="text" count={3} />
        </div>
    );
}

export default WidgetContentSkeleton;
