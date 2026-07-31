/**
 * Rescue Routes — 搜救、避難、醫療運送、ICS
 */
import { Route } from 'react-router-dom';
import {
  SheltersPage,
  TriagePage,
  SearchRescuePage,
  ReunificationPage,
  MedicalTransportPage,
  FieldCommsPage,
  ICSSectionDashboard,
  ICS201BriefingPage,
  ICS205CommsPage,
  ICSFormsPage,
} from '../components/lazy/LazyPages';
import ProtectedRoute from '../components/ProtectedRoute';
import PageWrapper from '../components/layout/PageWrapper';

export const rescueRoutes = (
  <>
    {/* Rescue Operations */}
    <Route path="/rescue/shelters" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="rescue-shelters"><SheltersPage /></PageWrapper></ProtectedRoute>} />
    {/* FE-4/3.3: 真版 TriagePage 以 useParams<{missionSessionId}> 讀取場次 ID，未提供時
        fetchVictims/fetchStats 會 early-return，畫面顯示空列表而非 crash。:missionSessionId? 選填。 */}
    <Route path="/rescue/triage/:missionSessionId?" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="rescue-triage"><TriagePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/rescue/search-rescue" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="rescue-search"><SearchRescuePage /></PageWrapper></ProtectedRoute>} />
    <Route path="/rescue/reunification" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="rescue-reunification"><ReunificationPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/rescue/medical-transport" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="rescue-medical"><MedicalTransportPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/rescue/field-comms" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="rescue-comms"><FieldCommsPage /></PageWrapper></ProtectedRoute>} />

    {/* ICS Dashboard & Forms */}
    <Route path="/ics" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ics-dashboard"><ICSSectionDashboard /></PageWrapper></ProtectedRoute>} />
    <Route path="/ics/:section" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ics-section"><ICSSectionDashboard /></PageWrapper></ProtectedRoute>} />
    <Route path="/ics/201" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ics-201"><ICS201BriefingPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/ics/205" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ics-205"><ICS205CommsPage /></PageWrapper></ProtectedRoute>} />
    <Route path="/ops/ics-forms" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ops-ics-forms"><ICSFormsPage /></PageWrapper></ProtectedRoute>} />
  </>
);
