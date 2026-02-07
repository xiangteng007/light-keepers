/**
 * Logistics Routes — 物資、裝備、捐款
 */
import { Route } from 'react-router-dom';
import {
  ResourcesPage,
  EquipmentPage,
  DonationsPage,
  UnifiedResourcesPage,
} from '../components/lazy/LazyPages';
import ProtectedRoute from '../components/ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';

export const logisticsRoutes = (
  <>
    <Route path="/logistics/inventory" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="logistics-inventory"><ResourcesPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/logistics/equipment" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-equipment"><EquipmentPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/logistics/donations" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-donations"><DonationsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/logistics/unified-resources" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-unified-resources"><UnifiedResourcesPage /></PageWrapper></ProtectedRoute>} />
  </>
);
