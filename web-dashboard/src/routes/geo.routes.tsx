/**
 * Geo Routes — 地圖、氣象、避難所（R1 IA 收斂）
 *
 * canonical：/geo/map、/geo/shelters；警報/氣象 canonical 在 hub（page-policy 收錄）
 */
import { Route, Navigate } from 'react-router-dom';
import {
  MapPage,
  SheltersPage,
} from '../components/lazy/LazyPages';
import PageWrapper from '../components/layout/PageWrapper';

export const geoRoutes = (
  <>
    <Route path="/geo/map" element={<PageWrapper pageId="unified-map"><MapPage /></PageWrapper>} />
    <Route path="/geo/map-ops" element={<Navigate to="/geo/map" replace />} />
    <Route path="/geo/tactical-map" element={<Navigate to="/geo/map" replace />} />
    <Route path="/geo/alerts" element={<Navigate to="/hub/geo-alerts" replace />} />
    <Route path="/geo/weather" element={<Navigate to="/hub/weather" replace />} />
    <Route path="/geo/shelters" element={<PageWrapper pageId="geo-shelters"><SheltersPage /></PageWrapper>} />
  </>
);
