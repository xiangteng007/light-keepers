/**
 * AI Assistant Widget
 * 
 * Widget for AI-powered dispatch suggestions and resource forecasting
 * v1.0
 */

import React, { useState } from 'react';
import {
    Bot,
    Send,
    Users,
    Package,
    Sparkles,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import styles from './AIAssistantWidget.module.css';

interface Suggestion {
    id: string;
    type: 'dispatch' | 'resource' | 'warning';
    title: string;
    description: string;
    confidence: number;
    action?: string;
}

export const AIAssistantWidget: React.FC = () => {
    const [expanded, setExpanded] = useState(true);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([
        {
            id: '1',
            type: 'dispatch',
            title: '建議派遣志工',
            description: '根據目前待處理任務數量，建議調派 3 名志工至北區',
            confidence: 0.85,
            action: '查看詳情',
        },
        {
            id: '2',
            type: 'resource',
            title: '物資預警',
            description: '飲用水存量低於安全水位，預計 2 天內需補充',
            confidence: 0.92,
            action: '立即處理',
        },
        {
            id: '3',
            type: 'warning',
            title: '疲勞警告',
            description: '志工王大明已連續工作 6 小時，建議安排休息',
            confidence: 0.78,
            action: '查看班表',
        },
    ]);

    const handleRefresh = async () => {
        setLoading(true);
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setSuggestions(prev => [
            {
                id: Date.now().toString(),
                type: 'dispatch',
                title: '查詢結果',
                description: `針對「${query}」的分析結果：建議採取預防措施`,
                confidence: 0.75,
            },
            ...prev,
        ]);

        setQuery('');
        setLoading(false);
    };

    const getTypeIcon = (type: Suggestion['type']) => {
        switch (type) {
            case 'dispatch':
                return <Users size={16} />;
            case 'resource':
                return <Package size={16} />;
            case 'warning':
                return <AlertTriangle size={16} />;
        }
    };

    const getTypeColor = (type: Suggestion['type']) => {
        switch (type) {
            case 'dispatch':
                return styles.dispatch;
            case 'resource':
                return styles.resource;
            case 'warning':
                return styles.warning;
        }
    };

    return (
        <div className={styles.widget}>
            {/* Header */}
            <div className={styles.header} onClick={() => setExpanded(!expanded)}>
                <div className={styles.headerLeft}>
                    <Bot size={20} className={styles.botIcon} />
                    <span className={styles.title}>AI 智慧助手</span>
                    <Sparkles size={14} className={styles.sparkle} />
                </div>
                <div className={styles.headerRight}>
                    <button
                        className={styles.refreshButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRefresh();
                        }}
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? styles.spinning : ''} />
                    </button>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* Content */}
            {expanded && (
                <div className={styles.content}>
                    {/* Query Input */}
                    <form className={styles.queryForm} onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="詢問 AI 助手..."
                            className={styles.queryInput}
                        />
                        <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={loading || !query.trim()}
                        >
                            {loading ? <Loader2 size={16} className={styles.spinning} /> : <Send size={16} />}
                        </button>
                    </form>

                    {/* Suggestions */}
                    <div className={styles.suggestions}>
                        {suggestions.map((suggestion) => (
                            <div
                                key={suggestion.id}
                                className={`${styles.suggestion} ${getTypeColor(suggestion.type)}`}
                            >
                                <div className={styles.suggestionIcon}>
                                    {getTypeIcon(suggestion.type)}
                                </div>
                                <div className={styles.suggestionContent}>
                                    <div className={styles.suggestionHeader}>
                                        <span className={styles.suggestionTitle}>{suggestion.title}</span>
                                        <span className={styles.confidence}>
                                            {Math.round(suggestion.confidence * 100)}%
                                        </span>
                                    </div>
                                    <p className={styles.suggestionDesc}>{suggestion.description}</p>
                                    {suggestion.action && (
                                        <button className={styles.actionButton}>
                                            {suggestion.action}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className={styles.quickActions}>
                        <button className={styles.quickAction}>
                            <Users size={14} />
                            派遣建議
                        </button>
                        <button className={styles.quickAction}>
                            <Package size={14} />
                            物資預測
                        </button>
                        <button className={styles.quickAction}>
                            <AlertTriangle size={14} />
                            風險評估
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAssistantWidget;
