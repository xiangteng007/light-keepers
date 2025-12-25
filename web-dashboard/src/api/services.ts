import api from './client';

// Health
export const getHealth = () => api.get('/health');

// Auth
export const login = (email: string, password: string) =>
    api.post('/auth/login', { email, password });

export const register = (data: { email?: string; phone?: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data);

export const getProfile = () => api.get('/auth/me');

// ===== OTP 驗證 =====

export const sendPhoneOtp = (phone: string) =>
    api.post<{ success: boolean; message: string }>('/auth/send-otp', { phone });

export const verifyPhoneOtp = (phone: string, code: string) =>
    api.post<{ success: boolean; verified: boolean }>('/auth/verify-otp', { phone, code });

// ===== 密碼重設 =====

export const forgotPassword = (data: { email?: string; phone?: string }) =>
    api.post<{ success: boolean; message: string }>('/auth/forgot-password', data);

export const resetPassword = (token: string, newPassword: string) =>
    api.post<{ success: boolean; message: string }>('/auth/reset-password', { token, newPassword });

// ===== 帳號狀態 =====

export interface AccountStatus {
    approvalStatus: 'pending' | 'approved' | 'rejected';
    phoneVerified: boolean;
    emailVerified: boolean;
    volunteerProfileCompleted: boolean;
    needsSetup: boolean;
}

export const getAccountStatus = () =>
    api.get<AccountStatus>('/auth/me/status');

export const markVolunteerProfileCompleted = () =>
    api.post<{ success: boolean }>('/auth/me/volunteer-profile-completed');

// ===== 帳號審核 (管理員) =====

export interface PendingAccount {
    id: string;
    email: string;
    phone: string;
    displayName: string;
    createdAt: string;
}

export const getPendingAccounts = () =>
    api.get<PendingAccount[]>('/accounts/pending');

export const approveAccount = (accountId: string) =>
    api.patch<{ success: boolean; message: string }>(`/accounts/${accountId}/approve`);

export const rejectAccount = (accountId: string, reason?: string) =>
    api.patch<{ success: boolean; message: string }>(`/accounts/${accountId}/reject`, { reason });

// Accounts
export const getRoles = () => api.get('/accounts/roles');

// Events
export interface Event {
    id: string;
    title: string;
    description?: string;
    category?: string;
    severity?: number;
    status: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    createdAt: string;
}

export const getEvents = (params?: { status?: string; category?: string; limit?: number }) =>
    api.get<{ data: Event[]; total: number }>('/events', { params });

export const getEventStats = () =>
    api.get<{ active: number; resolved: number; bySeverity: Array<{ severity: number; count: number }> }>('/events/stats');

export const createEvent = (data: Partial<Event>) =>
    api.post<Event>('/events', data);

export const updateEvent = (id: string, data: Partial<Event>) =>
    api.put<Event>(`/events/${id}`, data);

// Tasks
export interface Task {
    id: string;
    title: string;
    description?: string;
    priority: number;
    status: string;
    createdAt: string;
    dueAt?: string;
    completedAt?: string;
}

export const getTasks = (params?: { status?: string; limit?: number }) =>
    api.get<{ data: Task[]; total: number }>('/tasks', { params });

export const getTaskKanban = () =>
    api.get<{ pending: Task[]; inProgress: Task[]; completed: Task[] }>('/tasks/kanban');

export const getTaskStats = () =>
    api.get<{ pending: number; inProgress: number; completed: number; overdue: number }>('/tasks/stats');

export const createTask = (data: Partial<Task>) =>
    api.post<Task>('/tasks', data);

export const updateTask = (id: string, data: Partial<Task>) =>
    api.put<Task>(`/tasks/${id}`, data);

// ===== NCDR 災害示警 =====

export interface NcdrAlert {
    id: string;
    alertId: string;
    alertTypeId: number;
    alertTypeName: string;
    title: string;
    description?: string;
    severity: 'critical' | 'warning' | 'info';
    sourceUnit?: string;
    publishedAt: string;
    expiresAt?: string;
    sourceLink?: string;
    latitude?: number;
    longitude?: number;
    affectedAreas?: string;
    isActive: boolean;
}

export interface AlertTypeDefinition {
    id: number;
    name: string;
    sourceUnit: string;
    category: 'central' | 'enterprise' | 'local';
    priority: 'core' | 'extended';
}

// 獲取示警類別定義
export const getNcdrAlertTypes = () =>
    api.get<{ types: AlertTypeDefinition[]; coreTypes: number[] }>('/ncdr-alerts/types');

// 獲取警報列表
export const getNcdrAlerts = (params?: { types?: string; activeOnly?: boolean; limit?: number }) =>
    api.get<{ data: NcdrAlert[]; total: number }>('/ncdr-alerts', { params });

// 獲取地圖用警報 (有座標)
export const getNcdrAlertsForMap = (types?: number[]) =>
    api.get<{ data: NcdrAlert[]; total: number }>('/ncdr-alerts/map', {
        params: types ? { types: types.join(',') } : undefined,
    });

// 獲取統計
export const getNcdrAlertStats = () =>
    api.get<{
        total: number;
        active: number;
        byType: { typeId: number; typeName: string; count: number }[];
        lastSyncTime: string | null;
    }>('/ncdr-alerts/stats');

// 手動觸發同步 (核心類別)
export const syncNcdrAlerts = () =>
    api.post<{ message: string; synced: number; errors: number }>('/ncdr-alerts/sync');

// 手動觸發同步指定類別
export const syncNcdrAlertTypes = (typeIds: number[]) =>
    api.post<{ message: string; synced: number; errors: number; syncedTypes: number[] }>(
        '/ncdr-alerts/sync-types',
        { typeIds }
    );

// ===== 公共資源（避難所/AED）=====

export interface Shelter {
    id: string;
    name: string;
    city: string;
    district: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity: number;
    type: string;
    status: 'open' | 'closed' | 'standby';
    phone?: string;
}

export interface AedLocation {
    id: string;
    name: string;
    address: string;
    city: string;
    district: string;
    latitude: number;
    longitude: number;
    placeName: string;
    floor?: string;
    openHours?: string;
    phone?: string;
}

// 取得所有避難收容所
export const getShelters = () =>
    api.get<{ data: Shelter[]; total: number }>('/public-resources/shelters');

// 查找附近避難收容所
export const getNearbyShelters = (lat: number, lng: number, radiusKm?: number) =>
    api.get<{ data: Shelter[]; total: number }>('/public-resources/shelters/nearby', {
        params: { lat, lng, radius: radiusKm }
    });

// 取得所有 AED 位置
export const getAedLocations = () =>
    api.get<{ data: AedLocation[]; total: number }>('/public-resources/aed');

// 查找附近 AED
export const getNearbyAed = (lat: number, lng: number, radiusKm?: number) =>
    api.get<{ data: AedLocation[]; total: number }>('/public-resources/aed/nearby', {
        params: { lat, lng, radius: radiusKm }
    });

// 取得地圖用公共資源（合併）
export const getPublicResourcesForMap = (types?: ('shelters' | 'aed')[]) =>
    api.get<{ shelters?: Shelter[]; aed?: AedLocation[] }>('/public-resources/map', {
        params: types ? { types: types.join(',') } : undefined
    });

// ===== 回報系統 Reports =====

export type ReportType = 'flood' | 'landslide' | 'road_damage' | 'power_outage' | 'water_outage' | 'building_damage' | 'other';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'pending' | 'confirmed' | 'rejected' | 'resolved';

export interface Report {
    id: string;
    type: ReportType;
    severity: ReportSeverity;
    status: ReportStatus;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string;
    photos?: string[];
    contactName?: string;
    contactPhone?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNote?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateReportDto {
    type: ReportType;
    severity?: ReportSeverity;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string;
    photos?: string[];
    contactName?: string;
    contactPhone?: string;
}

export interface ReviewReportDto {
    status: 'confirmed' | 'rejected';
    reviewedBy: string;
    reviewNote?: string;
}

// 取得回報列表
export const getReports = (params?: {
    status?: ReportStatus;
    type?: ReportType;
    severity?: ReportSeverity;
    limit?: number;
    offset?: number
}) => api.get<Report[]>('/reports', { params });

// 取得單一回報
export const getReport = (id: string) => api.get<Report>(`/reports/${id}`);

// 建立回報
export const createReport = (data: CreateReportDto) => api.post<Report>('/reports', data);

// 審核回報
export const reviewReport = (id: string, data: ReviewReportDto) =>
    api.patch<Report>(`/reports/${id}/review`, data);

// 刪除回報
export const deleteReport = (id: string) => api.delete(`/reports/${id}`);

// 取得地圖用回報
export const getReportsForMap = () => api.get<Report[]>('/reports/map');

// 取得回報統計
export const getReportStats = () => api.get<{
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
    byType: Record<string, number>;
}>('/reports/stats');

// ===== 志工管理 Volunteers =====

export type VolunteerStatus = 'available' | 'busy' | 'offline';

export interface Volunteer {
    id: string;
    name: string;
    email?: string;
    phone: string;
    region: string;
    address?: string;
    skills: string[];
    status: VolunteerStatus;
    serviceHours: number;
    taskCount: number;
    emergencyContact?: string;
    emergencyPhone?: string;
    photoUrl?: string;
    lineUserId?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateVolunteerDto {
    name: string;
    email?: string;
    phone: string;
    region: string;
    address?: string;
    skills: string[];
    emergencyContact?: string;
    emergencyPhone?: string;
    notes?: string;
    photoUrl?: string;
}

export interface UpdateVolunteerDto extends Partial<CreateVolunteerDto> {
    status?: VolunteerStatus;
}

// 取得志工列表 (遮罩版)
export const getVolunteers = (params?: {
    status?: VolunteerStatus;
    region?: string;
    skill?: string;
    limit?: number;
    offset?: number;
}) => api.get<Volunteer[]>('/volunteers', { params });

// 取得單一志工 (完整資料，需 Admin)
export const getVolunteer = (id: string) => api.get<Volunteer>(`/volunteers/${id}`);

// 建立志工
export const createVolunteer = (data: CreateVolunteerDto) => api.post<Volunteer>('/volunteers', data);

// 更新志工
export const updateVolunteer = (id: string, data: UpdateVolunteerDto) =>
    api.patch<Volunteer>(`/volunteers/${id}`, data);

// 刪除志工
export const deleteVolunteer = (id: string) => api.delete(`/volunteers/${id}`);

// 更新志工狀態
export const updateVolunteerStatus = (id: string, status: VolunteerStatus) =>
    api.patch<Volunteer>(`/volunteers/${id}/status`, { status });

// 取得可用志工
export const getAvailableVolunteers = (region?: string, skill?: string) =>
    api.get<Volunteer[]>('/volunteers/available', { params: { region, skill } });

// 取得志工統計
export const getVolunteerStats = () => api.get<{
    total: number;
    available: number;
    busy: number;
    offline: number;
    totalServiceHours: number;
}>('/volunteers/stats');

// ===== 物資管理 Resources =====

export type ResourceCategory = 'food' | 'water' | 'medical' | 'shelter' | 'clothing' | 'equipment' | 'other';
export type ResourceStatus = 'available' | 'low' | 'depleted';
export type TransactionType = 'in' | 'out' | 'transfer' | 'donation' | 'adjustment';

export interface Resource {
    id: string;
    name: string;
    category: ResourceCategory;
    description?: string;
    quantity: number;
    unit?: string;
    minQuantity?: number;
    status: ResourceStatus;
    location?: string;
    photoUrl?: string;
    barcode?: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ResourceTransaction {
    id: string;
    resourceId: string;
    type: TransactionType;
    quantity: number;
    beforeQuantity: number;
    afterQuantity: number;
    operatorName: string;
    operatorId?: string;
    fromLocation?: string;
    toLocation?: string;
    notes?: string;
    referenceNo?: string;
    createdAt: string;
}

export interface DonationSource {
    id: string;
    name: string;
    type: 'individual' | 'corporate' | 'government' | 'ngo' | 'other';
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    notes?: string;
    needsReceipt?: boolean;
    totalDonations: number;
    totalValue: number;
    createdAt: string;
}

export interface CreateResourceDto {
    name: string;
    category: ResourceCategory;
    description?: string;
    quantity: number;
    unit?: string;
    minQuantity?: number;
    location?: string;
    expiresAt?: string;
    photoUrl?: string;
    barcode?: string;
}

// 取得物資列表
export const getResources = (params?: { category?: ResourceCategory }) =>
    api.get<Resource[]>('/resources', { params });

// 取得單一物資
export const getResource = (id: string) => api.get<Resource>(`/resources/${id}`);

// 建立物資
export const createResource = (data: CreateResourceDto) => api.post<Resource>('/resources', data);

// 更新物資
export const updateResource = (id: string, data: Partial<CreateResourceDto>) =>
    api.patch<Resource>(`/resources/${id}`, data);

// 刪除物資
export const deleteResource = (id: string) => api.delete(`/resources/${id}`);

// 入庫
export const addStock = (id: string, quantity: number, operatorName: string, notes?: string) =>
    api.post<Resource>(`/resources/${id}/stock/add`, { quantity, operatorName, notes });

// 出庫
export const deductStock = (id: string, quantity: number, operatorName: string, notes?: string) =>
    api.post<Resource>(`/resources/${id}/stock/deduct`, { quantity, operatorName, notes });

// 取得異動紀錄
export const getResourceTransactions = (id: string) =>
    api.get<ResourceTransaction[]>(`/resources/${id}/transactions`);

// 取得所有異動紀錄
export const getAllTransactions = () => api.get<ResourceTransaction[]>('/resources/transactions/all');

// 條碼查詢
export const getResourceByBarcode = (barcode: string) =>
    api.get<Resource>(`/resources/barcode/${barcode}`);

// 物資轉移
export const transferResource = (id: string, data: {
    quantity: number;
    fromLocation: string;
    toLocation: string;
    operatorName: string;
}) => api.post<ResourceTransaction>(`/resources/${id}/transfer`, data);

// 取得捐贈來源
export const getDonationSources = () => api.get<DonationSource[]>('/resources/donations/sources');

// 建立捐贈來源
export const createDonationSource = (data: Partial<DonationSource>) =>
    api.post<DonationSource>('/resources/donations/sources', data);

// 記錄捐贈
export const recordDonation = (resourceId: string, data: {
    quantity: number;
    donationSourceId: string;
    operatorName: string;
    estimatedValue?: number;
}) => api.post<ResourceTransaction>(`/resources/${resourceId}/donate`, data);

// 取得物資統計
export const getResourceStats = () => api.get<{
    total: number;
    byCategory: Record<string, number>;
    lowStock: number;
    expiringSoon: number;
}>('/resources/stats');

// 取得低庫存物資
export const getLowStockResources = () =>
    api.get<Resource[]>('/resources/low-stock');

// 取得即期品
export const getExpiringResources = (days?: number) =>
    api.get<Resource[]>('/resources/expiring', { params: { days } });

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
    api.get<ScrapedCourse[]>('/training/scraper/courses', { params });

// 手動觸發爬取
export const triggerScrape = (sourceId?: string) =>
    api.post<{ success: number; failed: number }>('/training/scraper/trigger', { sourceId });

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

// ===== 通知系統 Notifications =====

export type NotificationType = 'system' | 'assignment' | 'mobilization' | 'training' | 'alert';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
    id: string;
    volunteerId?: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    relatedId?: string;
    isRead: boolean;
    readAt?: string;
    expiresAt?: string;
    createdAt: string;
}

// 取得通知列表
export const getNotifications = (volunteerId: string, params?: { unreadOnly?: boolean }) =>
    api.get<Notification[]>(`/notifications/${volunteerId}`, { params });

// 取得未讀數量
export const getUnreadCount = (volunteerId: string) =>
    api.get<{ count: number }>(`/notifications/${volunteerId}/unread-count`);

// 標記已讀
export const markNotificationAsRead = (id: string) =>
    api.patch<Notification>(`/notifications/${id}/read`);

// 標記全部已讀
export const markAllNotificationsAsRead = (volunteerId: string) =>
    api.patch<{ affected: number }>(`/notifications/${volunteerId}/read-all`);

// ===== 檔案上傳 Uploads =====

export interface UploadResult {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
}

// 上傳單一檔案 (Base64)
export const uploadFile = (file: string, folder?: string) =>
    api.post<UploadResult>('/uploads', { file, folder });

// 批次上傳多個檔案
export const uploadFiles = (files: string[], folder?: string) =>
    api.post<UploadResult[]>('/uploads/bulk', { files, folder });

// ===== 報表匯出 Reports Export =====

export interface VolunteerHoursReport {
    volunteerId: string;
    volunteerName: string;
    totalHours: number;
    taskCount: number;
}

export interface DisasterReport {
    totalEvents: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    responseTimeAvg: number;
}

// 取得志工時數報表
export const getVolunteerHoursReport = (start?: string, end?: string) =>
    api.get<{ success: boolean; data: VolunteerHoursReport[] }>('/reports-export/volunteer-hours', {
        params: { start, end },
    });

// 下載志工時數 CSV
export const downloadVolunteerHoursCSV = (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/reports-export/volunteer-hours/csv?${params.toString()}`, '_blank');
};

// 取得災情統計報表
export const getDisasterReport = (start?: string, end?: string) =>
    api.get<{ success: boolean; data: DisasterReport }>('/reports-export/disaster-stats', {
        params: { start, end },
    });

// 下載災情統計 JSON
export const downloadDisasterJSON = (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const baseUrl = api.defaults.baseURL || '';
    window.open(`${baseUrl}/reports-export/disaster-stats/json?${params.toString()}`, '_blank');
};
