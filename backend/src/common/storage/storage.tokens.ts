/**
 * storage.tokens.ts
 *
 * INF-1 / 工作項 M.3b：把直接使用 GCS SDK 的三個服務接上 storage 抽象層。
 *
 * Each of the three file-handling services owned a separate GCS bucket before
 * the migration. Those bindings are declared here so `STORAGE_PROVIDER=gcs`
 * reproduces the previous layout exactly, and `STORAGE_PROVIDER=local` sends
 * everything to the one NAS `/uploads/` tree that nginx serves.
 */
import { StorageFeatureOptions } from './storage.interface';

/** field-reports attachments (signed upload/download URLs) */
export const FIELD_REPORT_STORAGE = Symbol('FIELD_REPORT_STORAGE');
export const FIELD_REPORT_STORAGE_FEATURE: StorageFeatureOptions = {
    token: FIELD_REPORT_STORAGE,
    bucketEnvKey: 'GCS_BUCKET',
    defaultBucket: 'lightkeepers-uploads',
};

/** LINE disaster-report photos */
export const DISASTER_REPORT_IMAGE_STORAGE = Symbol('DISASTER_REPORT_IMAGE_STORAGE');
export const DISASTER_REPORT_IMAGE_STORAGE_FEATURE: StorageFeatureOptions = {
    token: DISASTER_REPORT_IMAGE_STORAGE,
    bucketEnvKey: 'GCS_BUCKET_NAME',
    defaultBucket: 'light-keepers-reports',
};

/** Offline map packages (overlays) */
export const MAP_PACKAGE_STORAGE = Symbol('MAP_PACKAGE_STORAGE');
export const MAP_PACKAGE_STORAGE_FEATURE: StorageFeatureOptions = {
    token: MAP_PACKAGE_STORAGE,
    bucketEnvKey: 'GCS_MAP_PACKAGES_BUCKET',
    defaultBucket: 'lightkeepers-map-packages',
};
