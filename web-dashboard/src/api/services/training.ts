import api from '../client';

// ===== 培訓系統爬蟲 Training Scraper =====

export type ScrapedCourseCategory = 'emt' | 'drone' | 'rescue' | 'first_aid' | 'cpr' | 'firefighting' | 'other';

export interface ScrapingSource {
    id: string;
    name: string;
    baseUrl: string;
    isActive: boolean;
    lastScrapedAt?: string;
    selectors: Record<string, string>;
    scheduleInterval?: number;
    createdAt: string;
}

export interface ScrapedCourse {
    id: string;
    sourceId: string;
    title: string;
    description?: string;
    organizer?: string;
    category: ScrapedCourseCategory;
    courseDate?: string;
    location?: string;
    originalUrl: string;
    scrapedAt: string;
}

// 取得爬取的課程
export const getScrapedCourses = (params?: { sourceId?: string; category?: ScrapedCourseCategory }) =>
    api.get<{ success: boolean; data: ScrapedCourse[]; count: number }>('/training/scraper/courses', { params });

// 手動觸發爬取
export const triggerScrape = (sourceId?: string) =>
    api.post<{ success: boolean; data: { success: number; failed: number }; message: string }>('/training/scraper/scrape', { sourceId });

// 取得爬蟲來源
export const getScrapingSources = () => api.get<ScrapingSource[]>('/training/scraper/sources');

// 建立爬蟲來源
export const createScrapingSource = (data: Partial<ScrapingSource>) =>
    api.post<ScrapingSource>('/training/scraper/sources', data);

// 更新爬蟲來源
export const updateScrapingSource = (id: string, data: Partial<ScrapingSource>) =>
    api.put<ScrapingSource>(`/training/scraper/sources/${id}`, data);

// 刪除爬蟲來源
export const deleteScrapingSource = (id: string) => api.delete(`/training/scraper/sources/${id}`);
