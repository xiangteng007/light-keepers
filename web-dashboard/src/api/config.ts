/**
 * API Configuration — Single Source of Truth
 * 
 * All components should import API_BASE_URL and API_BASE from here
 * instead of defining their own hardcoded URLs.
 * 
 * Re-exports apiClient from client.ts for backward compatibility
 */

import api from './client';

/** Root API URL (e.g., https://light-keepers-api-xxx.asia-east1.run.app) */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Versioned API base (e.g., .../api/v1) */
export const API_BASE = `${API_BASE_URL}/api/v1`;

/** WebSocket URL — shares same base as API */
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export const apiClient = api;
export default api;

