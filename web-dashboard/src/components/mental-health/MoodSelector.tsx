/**
 * MoodSelector.tsx
 * 
 * Interactive mood selector (1-10 scale) with emoji visualization
 */
import React, { useState } from 'react';
import './MoodSelector.css';

interface MoodSelectorProps {
    onSubmit: (score: number, note: string, tags: string[]) => void;
    disabled?: boolean;
}

const MOOD_TAGS = [
    { id: 'fatigue', label: '疲勞', emoji: '😴' },
    { id: 'sadness', label: '悲傷', emoji: '😢' },
    { id: 'anger', label: '憤怒', emoji: '😠' },
    { id: 'anxiety', label: '焦慮', emoji: '😰' },
    { id: 'calm', label: '平靜', emoji: '😌' },
    { id: 'hopeful', label: '希望', emoji: '🌟' },
    { id: 'overwhelmed', label: '不堪負荷', emoji: '😵' },
    { id: 'grateful', label: '感恩', emoji: '🙏' },
];

const getMoodEmoji = (score: number): string => {
    if (score <= 2) return '😢';
    if (score <= 4) return '😔';
    if (score <= 6) return '😐';
    if (score <= 8) return '🙂';
    return '😊';
};

const getMoodLabel = (score: number): string => {
    if (score <= 2) return '非常低落';
    if (score <= 4) return '有些低落';
    if (score <= 6) return '還可以';
    if (score <= 8) return '不錯';
    return '非常好';
};

export function MoodSelector({ onSubmit, disabled = false }: MoodSelectorProps) {
    const [score, setScore] = useState<number>(5);
    const [note, setNote] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    };

    const handleSubmit = async () => {
        if (disabled || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSubmit(score, note, selectedTags);
            // Reset form
            setNote('');
            setSelectedTags([]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mood-selector">
            <div className="mood-selector__header">
                <h3>今天感覺如何？</h3>
                <p>選擇最符合您目前狀態的分數</p>
            </div>

            {/* Emoji Display */}
            <div className="mood-selector__emoji">
                <span className="mood-emoji">{getMoodEmoji(score)}</span>
                <span className="mood-label">{getMoodLabel(score)}</span>
            </div>

            {/* Score Slider */}
            <div className="mood-selector__slider">
                <span className="slider-label">1</span>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value))}
                    className="mood-slider"
                    disabled={disabled}
                />
                <span className="slider-label">10</span>
            </div>
            <div className="mood-selector__score">{score} / 10</div>

            {/* Tags */}
            <div className="mood-selector__tags">
                <p className="tags-label">選擇相關情緒標籤（可多選）</p>
                <div className="tags-grid">
                    {MOOD_TAGS.map(tag => (
                        <button
                            key={tag.id}
                            className={`tag-btn ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                            onClick={() => toggleTag(tag.id)}
                            disabled={disabled}
                        >
                            <span>{tag.emoji}</span>
                            <span>{tag.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Note */}
            <div className="mood-selector__note">
                <textarea
                    placeholder="想說些什麼嗎？（選填）"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    disabled={disabled}
                />
            </div>

            {/* Submit */}
            <button
                className="mood-selector__submit"
                onClick={handleSubmit}
                disabled={disabled || isSubmitting}
            >
                {isSubmitting ? '記錄中...' : '記錄心情'}
            </button>
        </div>
    );
}
