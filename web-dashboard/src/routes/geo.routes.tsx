/**
 * Geo Routes — 地圖、氣象、避難所
 */
import { Route, Navigate } from 'react-router-dom';
import {
  MapPage,
  NcdrAlertsPage,
  ForecastPage,
  SheltersPage,
} from '../components/lazy/LazyPages';
import PageWrapper from '../components/layout/PageWrapper';

export const geoRoutes = (
  <>
    <Route path="/geo/map" element={<PageWrapper pageId="unified-map"><MapPage /></PageWrapper>} />
    <Route path="/geo/map-ops" element={<Navigate to="/geo/map" replace />} />
    <Route path="/geo/tactical-map" element={<Navigate to="/geo/map" replace />} />
    <Route path="/geo/alerts" element={<PageWrapper pageId="geo-alerts"><NcdrAlertsPage /></PageWrapper>} />
    <Route path="/geo/weather" element={<PageWrapper pageId="geo-weather"><ForecastPage /></PageWrapper>} />
    <Route path="/geo/shelters" element={<PageWrapper pageId="geo-shelters"><SheltersPage /></PageWrapper>} />
  </>
);
