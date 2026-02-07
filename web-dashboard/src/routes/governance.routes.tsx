/**
 * Governance Routes — 權限、稽核、安全、Webhooks
 */
import { Route } from 'react-router-dom';
import {
  PermissionsPage,
  AuditLogPage,
  SecurityPage,
  WebhooksPage,
  BiometricPage,
  SettingsPage,
  InteroperabilityPage,
} from '../components/lazy/LazyPages';
import ProtectedRoute from '../components/ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';

export const governanceRoutes = (
  <>
    <Route path="/governance/iam" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-iam"><PermissionsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/governance/audit" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-audit"><AuditLogPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/governance/security" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-security"><SecurityPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/governance/webhooks" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="governance-webhooks"><WebhooksPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/governance/biometric" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="governance-biometric"><BiometricPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/governance/settings" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="governance-settings"><SettingsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/governance/interoperability" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-interoperability"><InteroperabilityPage /></PageWrapper></ProtectedRoute>} />

    {/* Admin Audit Route (alias) */}
    <Route path="/admin/audit-logs" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="admin-audit-logs"><AuditLogPage /></PageWrapper></ProtectedRoute>} />
  </>
);
