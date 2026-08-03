import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * 視覺變體（B3c 野戰手冊）：
     * - `primary`：橄欖實心＋深字——每屏最多 1–2 個（金色紀律）。
     * - `secondary`：2px 描邊，一般動作預設。
     * - `danger`：⚠ 紅色憲法（DESIGN_LANGUAGE v2 §D）——**只准**用於生命/安全
     *   語義：SOS、BLACK 傷票、禁入區、撤離、不可逆銷毀。
     *   一般錯誤/取消/刪除草稿等請用 `secondary`（錯誤訊息走琥珀），不得掛 danger。
     * - `ghost`：無框文字鈕。
     */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    disabled,
    className = '',
    ...props
}) => {
    return (
        <button
            className={`lk-btn lk-btn--${variant} lk-btn--${size} ${loading ? 'lk-btn--loading' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <span className="lk-btn__spinner" />}
            {icon && <span className="lk-btn__icon">{icon}</span>}
            <span className="lk-btn__text">{children}</span>
        </button>
    );
};

export default Button;
