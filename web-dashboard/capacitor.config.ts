import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'org.lightkeepers.disaster',
    appName: 'Light Keepers',
    webDir: 'dist',

    // Server configuration for development
    server: {
        // Enable clear text for development
        androidScheme: 'https',
        // Allow navigation to external domains
        allowNavigation: ['*.googleapis.com', '*.google.com', '*.ncdr.nat.gov.tw'],
    },

    // iOS specific configuration
    ios: {
        contentInset: 'automatic',
        backgroundColor: '#1a1a2e',
        preferredContentMode: 'mobile',
        scheme: 'lightkeepers',
    },

    // Android specific configuration
    android: {
        backgroundColor: '#1a1a2e',
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: true, // Disable in production
    },

    // Plugins configuration
    plugins: {
        // Push Notifications
        PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
        },

        // Geolocation
        Geolocation: {
            // High accuracy for disaster response
        },

        // Local Notifications
        LocalNotifications: {
            smallIcon: 'ic_notification',
            iconColor: '#f5a623',
            sound: 'beep.wav',
        },

        // Camera
        Camera: {
            // For field reports
        },

        // Filesystem for offline maps
        Filesystem: {
            // PMTiles storage
        },

        // Splash Screen
        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            backgroundColor: '#1a1a2e',
            androidScaleType: 'CENTER_CROP',
            showSpinner: true,
            spinnerColor: '#f5a623',
        },

        // Status Bar
        StatusBar: {
            style: 'dark',
            backgroundColor: '#1a1a2e',
        },

        // Keyboard
        Keyboard: {
            resize: 'body',
            resizeOnFullScreen: true,
        },
    },
};

export default config;
