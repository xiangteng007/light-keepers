/**
 * WidgetPicker.tsx
 * 
 * Modal component for selecting and adding new widgets from available modules
 */
import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { WidgetModule, AVAILABLE_WIDGET_MODULES } from './widget.types';
import './WidgetPicker.css';

interface WidgetPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectModule: (module: WidgetModule) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    map: { label: '地圖', icon: '🗺️' },
    data: { label: '數據', icon: '📊' },
    tools: { label: '工具', icon: '🔧' },
    community: { label: '社群', icon: '❤️' },
    analytics: { label: '分析', icon: '📈' },
};

export function WidgetPicker({ isOpen, onClose, onSelectModule }: WidgetPickerProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    // Filter modules by category and search
    const filteredModules = AVAILABLE_WIDGET_MODULES.filter(mod => {
        const matchesCategory = !selectedCategory || mod.category === selectedCategory;
        const matchesSearch = !searchTerm ||
            mod.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mod.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Group by category
    const categories = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;

    const handleSelect = (module: WidgetModule) => {
        onSelectModule(module);
        onClose();
    };

    return (
        <div className="widget-picker-overlay" onClick={onClose}>
            <div className="widget-picker" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="widget-picker__header">
                    <h2>新增 Widget</h2>
                    <button className="widget-picker__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="widget-picker__search">
                    <input
                        type="text"
                        placeholder="搜尋模組..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Category Tabs */}
                <div className="widget-picker__tabs">
                    <button
                        className={`tab ${!selectedCategory ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(null)}
                    >
                        全部
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`tab ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {CATEGORY_LABELS[cat].icon} {CATEGORY_LABELS[cat].label}
                        </button>
                    ))}
                </div>

                {/* Module Grid */}
                <div className="widget-picker__grid">
                    {filteredModules.length === 0 ? (
                        <div className="widget-picker__empty">
                            沒有符合的模組
                        </div>
                    ) : (
                        filteredModules.map(module => (
                            <div
                                key={module.id}
                                className="widget-picker__card"
                                onClick={() => handleSelect(module)}
                            >
                                <div className="card-icon">{module.icon}</div>
                                <div className="card-info">
                                    <h4>{module.title}</h4>
                                    <p>{module.description}</p>
                                    <span className="card-size">
                                        {module.defaultSize.w}×{module.defaultSize.h}
                                    </span>
                                </div>
                                <div className="card-add">
                                    <Plus size={20} />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="widget-picker__footer">
                    <span>選擇要加入的 Widget 模組</span>
                </div>
            </div>
        </div>
    );
}
