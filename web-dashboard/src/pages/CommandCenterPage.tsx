/**
 * CommandCenterPage.tsx
 * 
 * Demonstrates the iOS Widget Layout System
 * Only Level 5 users can edit the widget layout
 * Each page has independent widget configuration via pageId
 */
import AppShellLayout from '../components/layout/AppShellLayout';
import { PermissionLevel } from '../components/layout/widget.types';
import { useAuth } from '../context/AuthContext';

export default function CommandCenterPage() {
    const { user } = useAuth();

    // Map user role to PermissionLevel
    // Level 5 = SystemOwner (Full widget editing)
    const userLevel = (user?.roleLevel as PermissionLevel) ?? PermissionLevel.Anonymous;  // Default to 0 (unauthenticated)

    return (
        <AppShellLayout userLevel={userLevel} pageId="command-center">
            {/* WidgetGrid is rendered inside AppShellLayout by default */}
        </AppShellLayout>
    );
}

