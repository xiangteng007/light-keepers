import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Card, Badge } from '../design-system';

// 手冊分類
const MANUAL_CATEGORIES = [
    {
        id: 'earthquake',
        name: '地震',
        icon: '🌍',
        color: '#5BA3C0',
        description: '地震發生時的應變措施與避難要點',
        manualCount: 5,
    },
    {
        id: 'typhoon',
        name: '颱風',
        icon: '🌀',
        color: '#7B6FA6',
        description: '颱風來襲前的準備與防災措施',
        manualCount: 4,
    },
    {
        id: 'flood',
        name: '水災',
        icon: '🌊',
        color: '#4DA6E8',
        description: '淹水、土石流的預防與應變',
        manualCount: 3,
    },
    {
        id: 'fire',
        name: '火災',
        icon: '🔥',
        color: '#E85A5A',
        description: '火災逃生與滅火器使用方法',
        manualCount: 4,
    },
    {
        id: 'firstaid',
        name: '急救',
        icon: '❤️',
        color: '#E53935',
        description: 'CPR、AED 使用與緊急傷患處理',
        manualCount: 6,
    },
    {
        id: 'shelter',
        name: '避難',
        icon: '🏠',
        color: '#4CAF50',
        description: '避難所使用規則與生存物資準備',
        manualCount: 3,
    },
];

// 手冊列表 (示範資料)
const MANUALS = [
    // 地震
    {
        id: 'eq-1',
        categoryId: 'earthquake',
        title: '地震發生時的「趴下、掩護、穩住」',
        summary: '地震來臨時的基本自保動作',
        tags: ['基礎', '室內'],
        order: 1,
    },
    {
        id: 'eq-2',
        categoryId: 'earthquake',
        title: '地震後的安全確認步驟',
        summary: '震後應立即確認的安全事項',
        tags: ['震後', '安全確認'],
        order: 2,
    },
    {
        id: 'eq-3',
        categoryId: 'earthquake',
        title: '室外遭遇地震的應變方法',
        summary: '在戶外時地震的正確應對',
        tags: ['戶外', '避難'],
        order: 3,
    },
    // 颱風
    {
        id: 'ty-1',
        categoryId: 'typhoon',
        title: '颱風來臨前的防災準備清單',
        summary: '颱風警報發布後應準備的物資與措施',
        tags: ['準備', '物資'],
        order: 1,
    },
    {
        id: 'ty-2',
        categoryId: 'typhoon',
        title: '颱風天的居家安全注意事項',
        summary: '颱風期間待在家中的安全守則',
        tags: ['居家', '安全'],
        order: 2,
    },
    // 水災
    {
        id: 'fl-1',
        categoryId: 'flood',
        title: '淹水時的緊急應變措施',
        summary: '住家開始淹水時的處理步驟',
        tags: ['緊急', '應變'],
        order: 1,
    },
    {
        id: 'fl-2',
        categoryId: 'flood',
        title: '土石流警戒與避難時機',
        summary: '如何判斷土石流危險並及時撤離',
        tags: ['土石流', '撤離'],
        order: 2,
    },
    // 火災
    {
        id: 'fr-1',
        categoryId: 'fire',
        title: '火災逃生的基本原則',
        summary: '遭遇火災時的逃生要點',
        tags: ['逃生', '基礎'],
        order: 1,
    },
    {
        id: 'fr-2',
        categoryId: 'fire',
        title: '滅火器的正確使用方法',
        summary: '各類滅火器的操作步驟',
        tags: ['滅火器', '操作'],
        order: 2,
    },
    // 急救
    {
        id: 'fa-1',
        categoryId: 'firstaid',
        title: 'CPR 心肺復甦術操作步驟',
        summary: '成人急救 CPR 的完整流程',
        tags: ['CPR', '急救'],
        order: 1,
    },
    {
        id: 'fa-2',
        categoryId: 'firstaid',
        title: 'AED 自動體外心臟電擊器使用指南',
        summary: '如何正確使用 AED 進行急救',
        tags: ['AED', '心臟'],
        order: 2,
    },
    {
        id: 'fa-3',
        categoryId: 'firstaid',
        title: '止血與傷口處理',
        summary: '外傷出血的緊急處理方法',
        tags: ['止血', '外傷'],
        order: 3,
    },
    // 避難
    {
        id: 'sh-1',
        categoryId: 'shelter',
        title: '緊急避難包準備清單',
        summary: '避難包應包含的基本物資',
        tags: ['避難包', '準備'],
        order: 1,
    },
    {
        id: 'sh-2',
        categoryId: 'shelter',
        title: '避難收容所生活須知',
        summary: '入住避難所的規則與注意事項',
        tags: ['避難所', '生活'],
        order: 2,
    },
];

// Fuse.js 搜尋設定
const fuseOptions = {
    keys: [
        { name: 'title', weight: 0.5 },
        { name: 'summary', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
    ],
    threshold: 0.4, // 模糊匹配閾值 (0 = 精確, 1 = 全匹配)
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
};

// 建立 Fuse 搜尋實例
const fuse = new Fuse(MANUALS, fuseOptions);

export default function ManualsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // 使用 Fuse.js 模糊搜尋
    const filteredManuals = useMemo(() => {
        let result = MANUALS;

        // 先按分類篩選
        if (selectedCategory) {
            result = result.filter(m => m.categoryId === selectedCategory);
        }

        // 使用 Fuse.js 進行模糊搜尋
        if (searchQuery.trim()) {
            const searchResults = selectedCategory
                ? new Fuse(result, fuseOptions).search(searchQuery)
                : fuse.search(searchQuery);

            return searchResults.map(r => r.item);
        }

        return result.sort((a, b) => a.order - b.order);
    }, [searchQuery, selectedCategory]);

    const selectedCategoryInfo = selectedCategory
        ? MANUAL_CATEGORIES.find(c => c.id === selectedCategory)
        : null;

    return (
        <div className="page manuals-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📖 實務手冊</h2>
                    <p className="page-subtitle">災難應變知識庫，支援離線存取</p>
                </div>
            </div>

            {/* 搜尋欄 */}
            <div className="manuals-search">
                <input
                    type="text"
                    placeholder="搜尋手冊標題、內容或標籤..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="manuals-search__input"
                />
                {searchQuery && (
                    <button
                        className="manuals-search__clear"
                        onClick={() => setSearchQuery('')}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* 分類卡片 */}
            {!selectedCategory && (
                <div className="category-grid">
                    {MANUAL_CATEGORIES.map((category) => (
                        <Card
                            key={category.id}
                            className="category-card"
                            padding="md"
                            onClick={() => setSelectedCategory(category.id)}
                        >
                            <div
                                className="category-card__icon"
                                style={{ backgroundColor: `${category.color}20` }}
                            >
                                <span style={{ fontSize: '32px' }}>{category.icon}</span>
                            </div>
                            <div className="category-card__content">
                                <h3 className="category-card__title">{category.name}</h3>
                                <p className="category-card__desc">{category.description}</p>
                                <Badge variant="default" size="sm">
                                    {category.manualCount} 篇手冊
                                </Badge>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* 手冊列表 */}
            {selectedCategory && (
                <div className="manuals-list-section">
                    <div className="manuals-list-header">
                        <button
                            className="manuals-back-btn"
                            onClick={() => setSelectedCategory(null)}
                        >
                            ← 返回分類
                        </button>
                        <div className="manuals-list-title">
                            <span style={{ fontSize: '24px' }}>{selectedCategoryInfo?.icon}</span>
                            <h3>{selectedCategoryInfo?.name}</h3>
                        </div>
                    </div>

                    <div className="manuals-list">
                        {filteredManuals.length > 0 ? (
                            filteredManuals.map((manual) => (
                                <Link
                                    key={manual.id}
                                    to={`/manuals/${manual.id}`}
                                    className="manual-item"
                                >
                                    <div className="manual-item__content">
                                        <h4 className="manual-item__title">{manual.title}</h4>
                                        <p className="manual-item__summary">{manual.summary}</p>
                                        <div className="manual-item__tags">
                                            {manual.tags.map((tag) => (
                                                <Badge key={tag} variant="default" size="sm">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="manual-item__arrow">→</span>
                                </Link>
                            ))
                        ) : (
                            <div className="manuals-empty">
                                <span>📭</span>
                                <p>找不到符合條件的手冊</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 搜尋結果 (全域搜尋) */}
            {!selectedCategory && searchQuery && (
                <div className="manuals-search-results">
                    <h3>搜尋結果 ({filteredManuals.length})</h3>
                    <div className="manuals-list">
                        {filteredManuals.length > 0 ? (
                            filteredManuals.map((manual) => {
                                const category = MANUAL_CATEGORIES.find(c => c.id === manual.categoryId);
                                return (
                                    <Link
                                        key={manual.id}
                                        to={`/manuals/${manual.id}`}
                                        className="manual-item"
                                    >
                                        <div className="manual-item__category">
                                            <span>{category?.icon}</span>
                                        </div>
                                        <div className="manual-item__content">
                                            <h4 className="manual-item__title">{manual.title}</h4>
                                            <p className="manual-item__summary">{manual.summary}</p>
                                        </div>
                                        <span className="manual-item__arrow">→</span>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="manuals-empty">
                                <span>🔍</span>
                                <p>找不到「{searchQuery}」相關的手冊</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
