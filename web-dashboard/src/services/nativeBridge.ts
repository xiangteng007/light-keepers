/**
 * Native Bridge Service
 * Provides unified API for native Capacitor plugins
 * Falls back to web APIs when running in browser
 * 
 * Note: Capacitor packages are OPTIONAL dependencies.
 * This service uses dynamic imports to avoid build errors when packages are not installed.
 */

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
}

export interface CameraPhoto {
    base64: string;
    dataUrl: string;
    format: 'jpeg' | 'png';
    webPath?: string;
}

export interface NativeNotification {
    id: number;
    title: string;
    body: string;
    largeBody?: string;
    summaryText?: string;
    data?: Record<string, any>;
    schedule?: { at: Date };
}

class NativeBridgeService {
    private _isNative = false;
    private _initialized = false;
    private plugins: Record<string, any> = {};

    async initialize(): Promise<void> {
        if (this._initialized) return;

        try {
            // Check if running in Capacitor - dynamic import
            const core = await import('@capacitor/core' as any).catch(() => null);
            if (!core) {
                console.log('[NativeBridge] Capacitor not available, using web APIs');
                this._initialized = true;
                return;
            }

            this._isNative = core.Capacitor?.isNativePlatform?.() || false;

            if (this._isNative) {
                // Load plugins dynamically - each can fail independently
                await Promise.allSettled([
                    this.loadPlugin('geolocation', '@capacitor/geolocation'),
                    this.loadPlugin('camera', '@capacitor/camera'),
                    this.loadPlugin('pushNotifications', '@capacitor/push-notifications'),
                    this.loadPlugin('localNotifications', '@capacitor/local-notifications'),
                    this.loadPlugin('filesystem', '@capacitor/filesystem'),
                    this.loadPlugin('statusBar', '@capacitor/status-bar'),
                    this.loadPlugin('splashScreen', '@capacitor/splash-screen'),
                    this.loadPlugin('haptics', '@capacitor/haptics'),
                ]);

                console.log('[NativeBridge] Running on native platform');
            } else {
                console.log('[NativeBridge] Running in browser');
            }
        } catch (error) {
            console.log('[NativeBridge] Initialization error, using web APIs', error);
        }

        this._initialized = true;
    }

    private async loadPlugin(name: string, packageName: string): Promise<void> {
        try {
            const module = await import(packageName as any);
            this.plugins[name] = module;
        } catch {
            // Plugin not available
        }
    }

    get isNativePlatform(): boolean {
        return this._isNative;
    }

    get initialized(): boolean {
        return this._initialized;
    }

    // ==================== Geolocation ====================

    async getCurrentPosition(): Promise<LocationData | null> {
        try {
            if (this._isNative && this.plugins.geolocation?.Geolocation) {
                const position = await this.plugins.geolocation.Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
                return {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                };
            } else {
                return new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            resolve({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                timestamp: position.timestamp,
                            });
                        },
                        (error) => reject(error),
                        { enableHighAccuracy: true, timeout: 10000 }
                    );
                });
            }
        } catch (error) {
            console.error('[NativeBridge] Geolocation error:', error);
            return null;
        }
    }

    async watchPosition(callback: (location: LocationData) => void): Promise<string | null> {
        try {
            if (this._isNative && this.plugins.geolocation?.Geolocation) {
                const watchId = await this.plugins.geolocation.Geolocation.watchPosition(
                    { enableHighAccuracy: true },
                    (position: any) => {
                        if (position) {
                            callback({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                timestamp: position.timestamp,
                            });
                        }
                    }
                );
                return watchId;
            } else {
                const watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        callback({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: position.timestamp,
                        });
                    },
                    (error) => console.error('Watch position error:', error),
                    { enableHighAccuracy: true }
                );
                return String(watchId);
            }
        } catch (error) {
            console.error('[NativeBridge] Watch position error:', error);
            return null;
        }
    }

    async clearWatch(watchId: string): Promise<void> {
        if (this._isNative && this.plugins.geolocation?.Geolocation) {
            await this.plugins.geolocation.Geolocation.clearWatch({ id: watchId });
        } else {
            navigator.geolocation.clearWatch(parseInt(watchId));
        }
    }

    // ==================== Camera ====================

    async takePhoto(): Promise<CameraPhoto | null> {
        try {
            if (this._isNative && this.plugins.camera?.Camera) {
                const { CameraResultType, CameraSource } = this.plugins.camera;
                const photo = await this.plugins.camera.Camera.getPhoto({
                    quality: 80,
                    allowEditing: false,
                    resultType: CameraResultType.Base64,
                    source: CameraSource.Camera,
                });
                return {
                    base64: photo.base64String || '',
                    dataUrl: `data:image/${photo.format};base64,${photo.base64String}`,
                    format: photo.format as 'jpeg' | 'png',
                    webPath: photo.webPath,
                };
            } else {
                return new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                            const base64 = await this.fileToBase64(file);
                            resolve({
                                base64,
                                dataUrl: `data:${file.type};base64,${base64}`,
                                format: file.type.includes('png') ? 'png' : 'jpeg',
                            });
                        } else {
                            resolve(null);
                        }
                    };
                    input.click();
                });
            }
        } catch (error) {
            console.error('[NativeBridge] Camera error:', error);
            return null;
        }
    }

    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ==================== Notifications ====================

    async requestNotificationPermission(): Promise<boolean> {
        try {
            if (this._isNative && this.plugins.pushNotifications?.PushNotifications) {
                const result = await this.plugins.pushNotifications.PushNotifications.requestPermissions();
                return result.receive === 'granted';
            } else if ('Notification' in window) {
                const result = await Notification.requestPermission();
                return result === 'granted';
            }
            return false;
        } catch (error) {
            console.error('[NativeBridge] Notification permission error:', error);
            return false;
        }
    }

    async sendLocalNotification(notification: NativeNotification): Promise<void> {
        try {
            if (this._isNative && this.plugins.localNotifications?.LocalNotifications) {
                await this.plugins.localNotifications.LocalNotifications.schedule({
                    notifications: [{
                        id: notification.id,
                        title: notification.title,
                        body: notification.body,
                        largeBody: notification.largeBody,
                        summaryText: notification.summaryText,
                        extra: notification.data,
                        schedule: notification.schedule,
                    }],
                });
            } else if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.body,
                    data: notification.data,
                });
            }
        } catch (error) {
            console.error('[NativeBridge] Local notification error:', error);
        }
    }

    // ==================== Haptics ====================

    async vibrate(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
        try {
            if (this._isNative && this.plugins.haptics?.Haptics) {
                const { ImpactStyle } = this.plugins.haptics;
                const styleMap: Record<string, any> = {
                    light: ImpactStyle?.Light,
                    medium: ImpactStyle?.Medium,
                    heavy: ImpactStyle?.Heavy,
                };
                await this.plugins.haptics.Haptics.impact({ style: styleMap[style] });
            } else if (navigator.vibrate) {
                const durationMap = { light: 50, medium: 100, heavy: 200 };
                navigator.vibrate(durationMap[style]);
            }
        } catch {
            // Haptics not available
        }
    }

    // ==================== Status Bar ====================

    async setStatusBarStyle(style: 'light' | 'dark'): Promise<void> {
        if (this._isNative && this.plugins.statusBar?.StatusBar) {
            const { Style } = this.plugins.statusBar;
            await this.plugins.statusBar.StatusBar.setStyle({
                style: style === 'dark' ? Style?.Dark : Style?.Light,
            });
        }
    }

    async hideStatusBar(): Promise<void> {
        if (this._isNative && this.plugins.statusBar?.StatusBar) {
            await this.plugins.statusBar.StatusBar.hide();
        }
    }

    async showStatusBar(): Promise<void> {
        if (this._isNative && this.plugins.statusBar?.StatusBar) {
            await this.plugins.statusBar.StatusBar.show();
        }
    }

    // ==================== Splash Screen ====================

    async hideSplashScreen(): Promise<void> {
        if (this._isNative && this.plugins.splashScreen?.SplashScreen) {
            await this.plugins.splashScreen.SplashScreen.hide();
        }
    }
}

// Singleton instance
export const nativeBridge = new NativeBridgeService();

export default nativeBridge;
