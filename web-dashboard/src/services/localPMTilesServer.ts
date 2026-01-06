/**
 * Local PMTiles Server for Capacitor
 * 
 * This module provides a way to serve PMTiles locally on mobile devices.
 * It uses a custom protocol handler or local HTTP server depending on platform.
 * 
 * For Web/Browser: Uses the PMTiles library directly with file:// URLs or Blob URLs
 * For Native: Registers a custom scheme handler that serves tile data
 */

import { Capacitor } from '@capacitor/core';
import * as pmtiles from 'pmtiles';
import { readPackageAsArrayBuffer } from './capacitorFilesystem';

// NOTE: Native local server would need a Capacitor plugin implementation
// The interface below documents what the plugin API would look like:
// interface LocalServerPlugin {
//     start(options: { port: number }): Promise<{ port: number }>;
//     stop(): Promise<void>;
//     registerHandler(...): Promise<void>;
// }
// const LocalServer = registerPlugin<LocalServerPlugin>('LocalServer');

/**
 * PMTiles source that works with local files
 */
export class LocalPMTilesSource implements pmtiles.Source {
    private buffer: ArrayBuffer | null = null;
    private fileName: string;

    constructor(fileName: string) {
        this.fileName = fileName;
    }

    async load(): Promise<void> {
        this.buffer = await readPackageAsArrayBuffer(this.fileName);
    }

    getKey(): string {
        return `local://${this.fileName}`;
    }

    async getBytes(offset: number, length: number): Promise<pmtiles.RangeResponse> {
        if (!this.buffer) {
            await this.load();
        }

        const data = this.buffer!.slice(offset, offset + length);
        return {
            data,
            etag: undefined,
            cacheControl: undefined,
            expires: undefined,
        };
    }
}

/**
 * Manager for local PMTiles serving
 */
export class LocalPMTilesServer {
    private archives: Map<string, pmtiles.PMTiles> = new Map();
    private isRunning = false;
    private port: number = 8765;

    /**
     * Register a local PMTiles file
     */
    async register(fileName: string): Promise<string> {
        const source = new LocalPMTilesSource(fileName);
        await source.load();

        const archive = new pmtiles.PMTiles(source);
        this.archives.set(fileName, archive);

        // Return a URL that can be used in MapLibre
        if (Capacitor.isNativePlatform()) {
            // Native: use local server URL
            return `http://localhost:${this.port}/tiles/${encodeURIComponent(fileName)}/{z}/{x}/{y}`;
        } else {
            // Web: return pmtiles protocol URL (requires pmtiles protocol registration)
            return `pmtiles://local/${encodeURIComponent(fileName)}/{z}/{x}/{y}`;
        }
    }

    /**
     * Unregister a PMTiles file
     */
    unregister(fileName: string): void {
        this.archives.delete(fileName);
    }

    /**
     * Get tile data from a registered archive
     */
    async getTile(fileName: string, z: number, x: number, y: number): Promise<Uint8Array | null> {
        const archive = this.archives.get(fileName);
        if (!archive) {
            throw new Error(`Archive not registered: ${fileName}`);
        }

        const tile = await archive.getZxy(z, x, y);
        if (!tile?.data) return null;
        return new Uint8Array(tile.data);
    }

    /**
     * Get archive metadata
     */
    async getMetadata(fileName: string): Promise<object | null> {
        const archive = this.archives.get(fileName);
        if (!archive) return null;

        const header = await archive.getHeader();
        const metadata = await archive.getMetadata();

        return Object.assign({}, metadata, {
            format: header.tileType,
            minzoom: header.minZoom,
            maxzoom: header.maxZoom,
            bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
            center: [header.centerLon, header.centerLat, header.centerZoom],
        });
    }

    /**
     * Start the local server (native only)
     */
    async start(): Promise<void> {
        if (this.isRunning) return;

        if (Capacitor.isNativePlatform()) {
            // Would start native HTTP server plugin
            // await LocalServer.start({ port: this.port });
            console.log('[LocalPMTilesServer] Native server would start on port', this.port);
        }

        this.isRunning = true;
    }

    /**
     * Stop the local server
     */
    async stop(): Promise<void> {
        if (!this.isRunning) return;

        if (Capacitor.isNativePlatform()) {
            // await LocalServer.stop();
            console.log('[LocalPMTilesServer] Native server stopped');
        }

        this.archives.clear();
        this.isRunning = false;
    }

    /**
     * Get a MapLibre-compatible source spec for a registered archive
     */
    async getSourceSpec(fileName: string): Promise<object> {
        const metadata = await this.getMetadata(fileName);
        const url = await this.register(fileName);

        return {
            type: 'vector',
            tiles: [url],
            minzoom: (metadata as any)?.minzoom || 0,
            maxzoom: (metadata as any)?.maxzoom || 14,
            bounds: (metadata as any)?.bounds,
        };
    }
}

/**
 * Register PMTiles protocol for MapLibre GL JS
 * This allows pmtiles:// URLs to work in MapLibre
 */
export function registerPMTilesProtocol(maplibregl: any): void {
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
}

/**
 * Create a Blob URL for a local PMTiles file (web fallback)
 */
export async function createBlobUrl(fileName: string): Promise<string> {
    const buffer = await readPackageAsArrayBuffer(fileName);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    return URL.createObjectURL(blob);
}

// Singleton instance
export const localPMTilesServer = new LocalPMTilesServer();

export default {
    LocalPMTilesSource,
    LocalPMTilesServer,
    localPMTilesServer,
    registerPMTilesProtocol,
    createBlobUrl,
};
