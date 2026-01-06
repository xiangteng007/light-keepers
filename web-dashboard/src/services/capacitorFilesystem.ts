/**
 * Capacitor filesystem utilities for offline map package management
 * This module provides cross-platform file operations using Capacitor's Filesystem API
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const MAP_PACKAGES_DIR = 'map-packages';

export interface PackageFile {
    name: string;
    path: string;
    size: number;
    modifiedAt: number;
    type: 'pmtiles' | 'mbtiles' | 'style' | 'unknown';
}

export interface DownloadOptions {
    url: string;
    fileName: string;
    onProgress?: (progress: number, totalBytes: number) => void;
    signal?: AbortSignal;
}

/**
 * Check if running on native platform (iOS/Android)
 */
export function isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
}

/**
 * Initialize the map packages directory
 */
export async function initPackagesDirectory(): Promise<void> {
    try {
        await Filesystem.mkdir({
            path: MAP_PACKAGES_DIR,
            directory: Directory.Data,
            recursive: true,
        });
    } catch {
        // Directory may already exist
    }
}

/**
 * List all downloaded packages
 */
export async function listPackages(): Promise<PackageFile[]> {
    await initPackagesDirectory();

    try {
        const result = await Filesystem.readdir({
            path: MAP_PACKAGES_DIR,
            directory: Directory.Data,
        });

        const packages: PackageFile[] = [];

        for (const file of result.files) {
            if (file.type === 'directory') continue;

            const stat = await getFileStat(`${MAP_PACKAGES_DIR}/${file.name}`);
            if (!stat) continue;

            packages.push({
                name: file.name,
                path: `${MAP_PACKAGES_DIR}/${file.name}`,
                size: stat.size || 0,
                modifiedAt: stat.mtime || Date.now(),
                type: getFileType(file.name),
            });
        }

        return packages;
    } catch {
        return [];
    }
}

/**
 * Get file type from extension
 */
function getFileType(fileName: string): PackageFile['type'] {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pmtiles': return 'pmtiles';
        case 'mbtiles': return 'mbtiles';
        case 'json': return 'style';
        default: return 'unknown';
    }
}

/**
 * Get file stats
 */
async function getFileStat(path: string): Promise<{ size?: number; mtime?: number } | null> {
    try {
        const result = await Filesystem.stat({
            path,
            directory: Directory.Data,
        });
        return { size: result.size, mtime: result.mtime };
    } catch {
        return null;
    }
}

/**
 * Download a file with progress tracking
 */
export async function downloadPackage(options: DownloadOptions): Promise<string> {
    const { url, fileName, onProgress, signal } = options;
    const targetPath = `${MAP_PACKAGES_DIR}/${fileName}`;

    await initPackagesDirectory();

    // Use fetch for download with progress
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Unable to read response');
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (onProgress) {
            onProgress(receivedLength, contentLength);
        }
    }

    // Combine chunks
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
    }

    // Convert to base64 for Capacitor filesystem
    const base64 = btoa(String.fromCharCode(...allChunks));

    // Write file
    await Filesystem.writeFile({
        path: targetPath,
        data: base64,
        directory: Directory.Data,
    });

    return targetPath;
}

/**
 * Delete a package
 */
export async function deletePackage(fileName: string): Promise<void> {
    await Filesystem.deleteFile({
        path: `${MAP_PACKAGES_DIR}/${fileName}`,
        directory: Directory.Data,
    });
}

/**
 * Read a package file as ArrayBuffer (for PMTiles)
 */
export async function readPackageAsArrayBuffer(fileName: string): Promise<ArrayBuffer> {
    const result = await Filesystem.readFile({
        path: `${MAP_PACKAGES_DIR}/${fileName}`,
        directory: Directory.Data,
    });

    // Convert base64 to ArrayBuffer
    const binaryString = atob(result.data as string);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Read a style JSON file
 */
export async function readStyleJson(fileName: string): Promise<object> {
    const result = await Filesystem.readFile({
        path: `${MAP_PACKAGES_DIR}/${fileName}`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
    });

    return JSON.parse(result.data as string);
}

/**
 * Get the native file URI for a package (for WebView access)
 */
export async function getPackageUri(fileName: string): Promise<string> {
    const result = await Filesystem.getUri({
        path: `${MAP_PACKAGES_DIR}/${fileName}`,
        directory: Directory.Data,
    });
    return result.uri;
}

/**
 * Calculate SHA256 hash of a file for verification
 */
export async function verifyPackageHash(fileName: string, expectedHash: string): Promise<boolean> {
    const buffer = await readPackageAsArrayBuffer(fileName);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === expectedHash.toLowerCase();
}

/**
 * Get total storage used by packages
 */
export async function getStorageUsed(): Promise<number> {
    const packages = await listPackages();
    return packages.reduce((sum, pkg) => sum + pkg.size, 0);
}

/**
 * Check available storage space (platform-specific)
 */
export async function getAvailableStorage(): Promise<number | null> {
    // Not directly available in Capacitor, would need platform-specific plugin
    // Return null to indicate unknown
    return null;
}

export default {
    isNativePlatform,
    initPackagesDirectory,
    listPackages,
    downloadPackage,
    deletePackage,
    readPackageAsArrayBuffer,
    readStyleJson,
    getPackageUri,
    verifyPackageHash,
    getStorageUsed,
    getAvailableStorage,
};
