/**
 * useAppMode.ts — 雙模式（平時/災時）判定 hook（R1 / FE-7）
 *
 * 規則（DESIGN_LANGUAGE.md §1.1）：
 *   mode = override ?? (emergencyLevel >= Warning ? 'emergency' : 'normal')
 *
 * - 自動：EmergencyProvider 的 emergencyLevel >= EmergencyLevel.Warning(2)
 * - 手動覆寫：L2+ 幹部可切換（演練/復盤），存 localStorage['lk-app-mode-override']
 * - 視覺掛載：AppShellLayout 根節點 data-app-mode，tokens.css LAYER 8 接手換色
 */
import { useState, useCallback } from 'react';
import { useEmergencyContext, EmergencyLevel } from '../../context/useEmergencyContext';
import type { AppMode } from './useSidebarConfig';

const OVERRIDE_KEY = 'lk-app-mode-override';

function loadOverride(): AppMode | null {
    try {
        const v = localStorage.getItem(OVERRIDE_KEY);
        return v === 'emergency' || v === 'normal' ? v : null;
    } catch {
        return null;
    }
}

export function useAppMode() {
    const { emergencyLevel } = useEmergencyContext();
    const [override, setOverrideState] = useState<AppMode | null>(loadOverride);

    const autoMode: AppMode =
        emergencyLevel >= EmergencyLevel.Warning ? 'emergency' : 'normal';
    const mode: AppMode = override ?? autoMode;

    const setOverride = useCallback((next: AppMode | null) => {
        setOverrideState(next);
        try {
            if (next === null) localStorage.removeItem(OVERRIDE_KEY);
            else localStorage.setItem(OVERRIDE_KEY, next);
        } catch {
            // storage unavailable — in-memory state still applies
        }
    }, []);

    /** 切換災時模式（幹部手動）：從自動值翻轉；回到自動值時清除覆寫 */
    const toggleMode = useCallback(() => {
        const next: AppMode = mode === 'emergency' ? 'normal' : 'emergency';
        setOverride(next === autoMode ? null : next);
    }, [mode, autoMode, setOverride]);

    return {
        mode,
        autoMode,
        isEmergencyMode: mode === 'emergency',
        isOverridden: override !== null,
        setOverride,
        toggleMode,
    };
}

export default useAppMode;
