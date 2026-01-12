/**
 * ai-hub.service.ts
 * Frontend Client for AIHub
 */
import { api } from '../api';

export const aiHub = {
    predictTrend: (params: { dataType: string; days?: number }) =>
        api.post('/ai/predict', params),

    analyzeImage: (formData: FormData) =>
        api.post('/ai/vision/analyze', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    suggestDispatch: (taskId: string) =>
        api.post(`/ai/dispatch/suggest/${taskId}`),

    summarizeText: (text: string) =>
        api.post('/ai/summary', { text }),

    getTaskResult: (taskId: string) =>
        api.get(`/ai/tasks/${taskId}`),
};
