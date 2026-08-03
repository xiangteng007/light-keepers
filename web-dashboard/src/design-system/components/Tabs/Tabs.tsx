/**
 * Tabs — B3c 野戰手冊（R5/T6，補齊 T3 規格缺件）
 * 作用態＝底緣 3px 橄欖閂（不整塊填色——金色紀律／狀態安靜律）。
 * 純 tab bar：面板由呼叫端自行渲染（aria-controls 經 getPanelId 對上）。
 * 鍵盤：←/→/Home/End 循 WAI-ARIA「自動觸發」模式移動並切換。
 */
import React, { useCallback, useId, useRef, useState } from 'react';
import './Tabs.css';

export interface TabItem {
    key: string;
    label: React.ReactNode;
    disabled?: boolean;
}

export interface TabsProps {
    items: TabItem[];
    /** 受控作用 key；不給則走非受控（defaultActiveKey → 第一個可用項） */
    activeKey?: string;
    defaultActiveKey?: string;
    onChange?: (key: string) => void;
    size?: 'sm' | 'md';
    /** 平均分寬（行動端分段列） */
    fullWidth?: boolean;
    className?: string;
    'aria-label'?: string;
}

/** 供呼叫端把 tabpanel 的 id 對上 tab 的 aria-controls */
export const getTabId = (idBase: string, key: string) => `${idBase}-tab-${key}`;
export const getPanelId = (idBase: string, key: string) => `${idBase}-panel-${key}`;

export const Tabs: React.FC<TabsProps> = ({
    items,
    activeKey,
    defaultActiveKey,
    onChange,
    size = 'md',
    fullWidth = false,
    className = '',
    'aria-label': ariaLabel,
}) => {
    const idBase = useId();
    const listRef = useRef<HTMLDivElement>(null);
    const firstEnabled = items.find((it) => !it.disabled)?.key;
    const [innerKey, setInnerKey] = useState<string | undefined>(
        defaultActiveKey ?? firstEnabled
    );
    const currentKey = activeKey !== undefined ? activeKey : innerKey;

    const activate = useCallback(
        (key: string) => {
            if (activeKey === undefined) setInnerKey(key);
            onChange?.(key);
        },
        [activeKey, onChange]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const enabled = items.filter((it) => !it.disabled);
        if (enabled.length === 0) return;
        const idx = enabled.findIndex((it) => it.key === currentKey);
        let next: TabItem | undefined;
        switch (e.key) {
            case 'ArrowRight':
                next = enabled[(idx + 1) % enabled.length];
                break;
            case 'ArrowLeft':
                next = enabled[(idx - 1 + enabled.length) % enabled.length];
                break;
            case 'Home':
                next = enabled[0];
                break;
            case 'End':
                next = enabled[enabled.length - 1];
                break;
            default:
                return;
        }
        e.preventDefault();
        if (next && next.key !== currentKey) {
            activate(next.key);
            const btn = listRef.current?.querySelector<HTMLButtonElement>(
                `[id="${getTabId(idBase, next.key)}"]`
            );
            btn?.focus();
        }
    };

    const rootClasses = [
        'lk-tabs',
        `lk-tabs--${size}`,
        fullWidth ? 'lk-tabs--full-width' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            ref={listRef}
            role="tablist"
            aria-label={ariaLabel}
            className={rootClasses}
            onKeyDown={handleKeyDown}
        >
            {items.map((item) => {
                const isActive = item.key === currentKey;
                return (
                    <button
                        key={item.key}
                        id={getTabId(idBase, item.key)}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={getPanelId(idBase, item.key)}
                        tabIndex={isActive ? 0 : -1}
                        disabled={item.disabled}
                        className={`lk-tabs__tab${isActive ? ' lk-tabs__tab--active' : ''}`}
                        onClick={() => {
                            if (!item.disabled && !isActive) activate(item.key);
                        }}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};

export default Tabs;
