# Capacitor 原生封裝設定指南

## 📦 安裝依賴

```bash
# Capacitor 核心
npm install @capacitor/core @capacitor/cli

# 平台
npm install @capacitor/ios @capacitor/android

# 常用插件
npm install @capacitor/geolocation @capacitor/camera @capacitor/filesystem
npm install @capacitor/push-notifications @capacitor/local-notifications
npm install @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen
```

## 🔧 初始化平台

```bash
# 建構 Web 應用
npm run build

# 添加平台
npx cap add ios
npx cap add android

# 同步
npx cap sync
```

## 📱 iOS 設定

### Info.plist 權限
在 `ios/App/App/Info.plist` 添加：

```xml
<!-- 定位權限 -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>用於追蹤志工位置和災情定位</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>背景追蹤志工位置</string>

<!-- 相機權限 -->
<key>NSCameraUsageDescription</key>
<string>用於拍攝災情照片</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>用於選擇災情照片</string>

<!-- 推播通知權限 -->
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>location</string>
</array>
```

### 開啟 Xcode
```bash
npx cap open ios
```

## 🤖 Android 設定

### AndroidManifest.xml 權限
在 `android/app/src/main/AndroidManifest.xml` 添加：

```xml
<!-- 定位權限 -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- 相機權限 -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- 網路 -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- 推播通知 -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.VIBRATE"/>
```

### 開啟 Android Studio
```bash
npx cap open android
```

## 🔄 開發流程

```bash
# 1. 修改 Web 代碼
# 2. 建構
npm run build

# 3. 同步到原生專案
npx cap sync

# 4. 運行
npx cap run ios
npx cap run android
```

## 📲 Live Reload (開發用)

在 `capacitor.config.ts` 添加：

```typescript
server: {
    url: 'http://YOUR_LOCAL_IP:5173',
    cleartext: true,
}
```

然後運行：
```bash
npm run dev
npx cap run ios --livereload
```

## 🏗️ 建構發行版

### iOS
1. 用 Xcode 開啟
2. Product → Archive
3. 上傳到 App Store Connect

### Android
```bash
cd android
./gradlew assembleRelease
```

APK 位於: `android/app/build/outputs/apk/release/`

## 🔧 常見問題

### 地圖離線
使用 `capacitorFilesystem.ts` 下載 PMTiles 到本地儲存。

### Push 通知
需要在 Firebase Console 設定 iOS/Android 專案。

### 相機黑屏
確認 Info.plist 有正確的權限描述。
