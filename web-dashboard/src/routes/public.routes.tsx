/**
 * Public Routes — 不需要登入的獨立頁面
 */
import { Route, type RouteObject } from 'react-router-dom';
import {
  LoginPage,
  AuthCallbackPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  BindLinePage,
  VolunteerProfileSetupPage,
  ComponentShowcase,
  AccountPage,
} from '../components/lazy/LazyPages';
import ProtectedRoute from '../components/ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';

export const publicRoutes = (
  <>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/bind-line" element={<BindLinePage />} />
    <Route path="/volunteer-setup" element={<ProtectedRoute requiredLevel={1}><VolunteerProfileSetupPage /></ProtectedRoute>} />
    <Route path="/showcase" element={<ComponentShowcase />} />
    <Route path="/account" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="account"><AccountPage /></PageWrapper></ProtectedRoute>} />
  </>
);
