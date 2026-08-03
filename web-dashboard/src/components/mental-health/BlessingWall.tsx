/**
 * BlessingWall.tsx
 * 
 * Community blessing wall for mutual support
 */
import React, { useState, useEffect } from 'react';
import { HeartIcon } from '../../design-system/icons';
import './BlessingWall.css';

interface Blessing {
    id: string;
    displayName: string;
    message: string;
    iconType: string;
    likes: number;
    createdAt: string;
}

interface BlessingWallProps {
    blessings: Blessing[];
    onPostBlessing: (message: string, iconType: string) => Promise<void>;
    onLikeBlessing: (id: string) => void;
}

const ICONS = [
    { type: 'candle', emoji: '🕯️', label: '燭光' },
    { type: 'heart', emoji: '❤️', label: '愛心' },
    { type: 'star', emoji: '⭐', label: '星星' },
    { type: 'prayer', emoji: '🙏', label: '祈禱' },
    { type: 'rainbow', emoji: '🌈', label: '彩虹' },
    { type: 'sun', emoji: '☀️', label: '陽光' },
];

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    return `${Math.floor(diff / 86400000)} 天前`;
}

export function BlessingWall({ blessings, onPostBlessing, onLikeBlessing }: BlessingWallProps) {
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('candle');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onPostBlessing(message.trim(), selectedIcon);
            setMessage('');
            setShowForm(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="blessing-wall">
            <div className="blessing-wall__header">
                <h3><HeartIcon size={20} aria-hidden="true" /> 祈福牆</h3>
                <p>為災區與夥伴們送上祝福</p>
                <button
                    className="blessing-wall__add-btn"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '取消' : '送上祝福'}
                </button>
            </div>

            {/* Add Blessing Form */}
            {showForm && (
                <div className="blessing-form">
                    <div className="blessing-form__icons">
                        {ICONS.map(icon => (
                            <button
                                key={icon.type}
                                className={`icon-btn ${selectedIcon === icon.type ? 'selected' : ''}`}
                                onClick={() => setSelectedIcon(icon.type)}
                            >
                                <span>{icon.emoji}</span>
                            </button>
                        ))}
                    </div>
                    <textarea
                        placeholder="寫下您的祝福..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={200}
                    />
                    <div className="blessing-form__footer">
                        <span className="char-count">{message.length}/200</span>
                        <button
                            className="submit-btn"
                            onClick={handleSubmit}
                            disabled={!message.trim() || isSubmitting}
                        >
                            {isSubmitting ? '發送中...' : '發送祝福'}
                        </button>
                    </div>
                </div>
            )}

            {/* Blessings Grid */}
            <div className="blessing-grid">
                {blessings.length === 0 ? (
                    <div className="blessing-empty">
                        <span aria-hidden="true"><HeartIcon size={32} /></span>
                        <p>還沒有祝福，成為第一個送上祝福的人吧！</p>
                    </div>
                ) : (
                    blessings.map(blessing => (
                        <div key={blessing.id} className="blessing-card">
                            <div className="blessing-card__icon">
                                {ICONS.find(i => i.type === blessing.iconType)?.emoji || '🕯️'}
                            </div>
                            <div className="blessing-card__content">
                                <p className="blessing-message">{blessing.message}</p>
                                <div className="blessing-meta">
                                    <span className="blessing-author">{blessing.displayName}</span>
                                    <span className="blessing-time">{formatTime(blessing.createdAt)}</span>
                                </div>
                            </div>
                            <button
                                className="blessing-card__like"
                                onClick={() => onLikeBlessing(blessing.id)}
                            >
                                <HeartIcon size={16} aria-hidden="true" /> {blessing.likes}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
