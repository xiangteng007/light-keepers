/**
 * Frontend Domain Pages - Barrel Export
 * 
 * 9 Strategic Domains matching backend architecture
 * 
 * Usage:
 * import { DashboardPage } from './pages/domains/data-insight';
 * import { MapPage, ForecastPage } from './pages/domains/geo-intel';
 * 
 * Migration Strategy:
 * 1. Current: Page files copied to domain folders  
 * 2. Future: Remove root files after App.tsx import update
 */

// Domain barrel exports
export * as AirOps from './air-ops';
export * as MissionCommand from './mission-command';
export * as GeoIntel from './geo-intel';
export * as Logistics from './logistics';
export * as Connectivity from './connectivity';
export * as DataInsight from './data-insight';
export * as Workforce from './workforce';
export * as Community from './community';
export * as Core from './core';
